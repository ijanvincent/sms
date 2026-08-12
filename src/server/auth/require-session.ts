import { cookies } from "next/headers";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export interface AdminSession {
  subject: string;
}

// The proxy matcher deliberately excludes `/api`, so route handlers get no
// session enforcement from it — every dashboard-facing endpoint must verify the
// cookie itself. Bearer-authenticated `v1` routes use authorizeRequest instead.
export async function requireSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload?.sub) return null;

  return { subject: payload.sub };
}
