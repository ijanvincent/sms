import { NextResponse } from "next/server";

// Unauthenticated liveness probe for container healthchecks, CI smoke tests, and
// the edge proxy. Intentionally does NOT touch the database: a transient DB blip
// should not get the web container marked unhealthy and restarted. Lives under
// /api, which the auth proxy already leaves open.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
