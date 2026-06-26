import { cookies } from "next/headers";

import { json, jsonError } from "@/lib/http";
import { verifyAdminCredentials } from "@/lib/auth/admin";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/auth/session";
import { loginSchema } from "@/server/validation/auth";
import { getClientIp } from "@/server/client-ip";
import {
  checkLoginThrottle,
  clearLoginThrottle,
  recordFailedLogin,
} from "@/server/auth/login-throttle";

export async function POST(request: Request) {
  const throttleKey = getClientIp(request);

  const throttle = checkLoginThrottle(throttleKey);
  if (throttle.locked) {
    const res = jsonError(
      429,
      "too_many_attempts",
      "Too many sign-in attempts. Please wait before trying again.",
      { retryAfter: throttle.retryAfterSeconds },
    );
    res.headers.set("Retry-After", String(throttle.retryAfterSeconds));
    return res;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "validation_error", "Invalid login payload.", parsed.error.issues);
  }

  const { username, password } = parsed.data;
  if (!(await verifyAdminCredentials(username, password))) {
    recordFailedLogin(throttleKey);
    return jsonError(401, "invalid_credentials", "Incorrect username or password.");
  }

  clearLoginThrottle(throttleKey);

  const token = await createSessionToken(username);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return json({ ok: true });
}
