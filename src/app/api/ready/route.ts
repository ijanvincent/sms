import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

// Readiness probe: unlike /api/health (liveness, no DB), this verifies the app can
// actually reach Postgres. Used by the CI deploy smoke test to fail a deploy when
// the app comes up but the database is unreachable. Lives under /api, which the
// auth proxy leaves open. Returns no data — only a ready/unavailable signal.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready" });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
