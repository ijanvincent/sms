import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Defense in depth: the edge proxy already gates these routes, but re-verify
  // the session here so a matcher misconfig or framework bug can't render the
  // dashboard (and its recipient data) to an unauthenticated request.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <MobileNav />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
