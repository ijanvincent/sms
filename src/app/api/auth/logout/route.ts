import { cookies } from "next/headers";

import { json, jsonError } from "@/lib/http";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { getClientIp } from "@/server/client-ip";
import { checkRateLimit } from "@/server/rate-limit";

const RATE_LIMIT = 60;

export async function POST(request: Request) {
  const rate = checkRateLimit(`auth-logout:${getClientIp(request)}`, RATE_LIMIT);
  if (!rate.allowed) {
    const res = jsonError(429, "rate_limited", "Too many requests; slow down.");
    res.headers.set("Retry-After", String(rate.retryAfterSeconds));
    return res;
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return json({ ok: true });
}
