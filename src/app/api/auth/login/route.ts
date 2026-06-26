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
import { checkRateLimit } from "@/server/rate-limit";
import {
  checkLoginThrottle,
  clearLoginThrottle,
  recordFailedLogin,
} from "@/server/auth/login-throttle";

// Generic per-IP request cap, separate from the failed-attempt lockout below:
// it bounds request *volume* (including the success path) so the expensive
// scrypt verification can't be used as a CPU-exhaustion vector.
const RATE_LIMIT = 10;

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  const rate = checkRateLimit(`auth-login:${clientIp}`, RATE_LIMIT);
  if (!rate.allowed) {
    const res = jsonError(429, "rate_limited", "Too many requests; slow down.");
    res.headers.set("Retry-After", String(rate.retryAfterSeconds));
    return res;
  }

  const throttle = checkLoginThrottle(clientIp);
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
    const result = recordFailedLogin(clientIp);

    if (result.locked) {
      const res = jsonError(
        429,
        "too_many_attempts",
        "Access locked — too many attempts. Please wait before trying again.",
        { retryAfter: result.retryAfterSeconds },
      );
      res.headers.set("Retry-After", String(result.retryAfterSeconds));
      return res;
    }

    return jsonError(
      401,
      "invalid_credentials",
      `Invalid credentials, ${result.attemptsRemaining} attempt(s) remaining.`,
      { attemptsRemaining: result.attemptsRemaining },
    );
  }

  clearLoginThrottle(clientIp);

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
