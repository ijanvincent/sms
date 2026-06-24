import { cookies } from "next/headers";

import { json, jsonError } from "@/lib/http";
import { verifyAdminCredentials } from "@/lib/auth/admin";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/auth/session";
import { loginSchema } from "@/server/validation/auth";

export async function POST(request: Request) {
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
    return jsonError(401, "invalid_credentials", "Incorrect username or password.");
  }

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
