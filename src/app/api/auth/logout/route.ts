import { cookies } from "next/headers";

import { json } from "@/lib/http";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return json({ ok: true });
}
