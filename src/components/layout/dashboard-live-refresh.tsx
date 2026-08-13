"use client";

import { useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  DASHBOARD_REFRESH_INTERVAL_MS,
  getDashboardRefreshBlockReason,
} from "@/lib/dashboard-refresh";

function hasPausedInteraction(): boolean {
  return document.querySelector('[data-live-refresh-pause="true"]') !== null;
}

export function DashboardLiveRefresh() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const refresh = useCallback(() => {
    const blockReason = getDashboardRefreshBlockReason({
      visible: document.visibilityState === "visible",
      online: navigator.onLine,
      interactionPaused: hasPausedInteraction(),
      refreshing: false,
    });
    if (blockReason) return;

    startTransition(() => router.refresh());
  }, [router]);

  useEffect(() => {
    const interval = window.setInterval(refresh, DASHBOARD_REFRESH_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  return null;
}
