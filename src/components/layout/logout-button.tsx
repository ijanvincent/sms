"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";

export function LogoutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onLogout() {
    if (submitting) return;
    setSubmitting(true);

    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={submitting}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out hover:bg-sidebar-accent/50 hover:text-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
    >
      {submitting ? <Spinner /> : <LogOut className="size-4" />}
      {submitting ? "Signing out…" : "Sign out"}
    </button>
  );
}
