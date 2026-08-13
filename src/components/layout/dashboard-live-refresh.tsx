"use client";

import { useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  DASHBOARD_REFRESH_INTERVAL_MS,
  getDashboardRefreshBlockReason,
  REALTIME_RECONNECT_INITIAL_MS,
  REALTIME_RECONNECT_MAX_MS,
} from "@/lib/dashboard-refresh";
import { nextReconnectDelay } from "@/lib/realtime-protocol";

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
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let reconnectDelay = REALTIME_RECONNECT_INITIAL_MS;
    let disposed = false;

    const connect = () => {
      if (disposed || socket?.readyState === WebSocket.OPEN) return;
      const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${scheme}//${window.location.host}/ws/dashboard`);
      socket.onopen = () => {
        reconnectDelay = REALTIME_RECONNECT_INITIAL_MS;
      };
      socket.onmessage = refresh;
      socket.onclose = () => {
        socket = null;
        if (disposed) return;
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = nextReconnectDelay(
          reconnectDelay,
          REALTIME_RECONNECT_MAX_MS,
        );
      };
    };

    connect();
    const interval = window.setInterval(refresh, DASHBOARD_REFRESH_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      disposed = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      socket?.close(1000, "dashboard unmounted");
    };
  }, [refresh]);

  return null;
}
