"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { CloudOff, Pause, Radio } from "lucide-react";

import {
  DASHBOARD_REFRESH_INTERVAL_MS,
  getDashboardRefreshBlockReason,
  type DashboardRefreshBlockReason,
} from "@/lib/dashboard-refresh";
import { cn } from "@/lib/utils";

function hasPausedInteraction(): boolean {
  return document.querySelector('[data-live-refresh-pause="true"]') !== null;
}

function subscribeToOnlineState(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getOnlineState() {
  return navigator.onLine;
}

export function DashboardLiveRefresh() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const online = useSyncExternalStore(subscribeToOnlineState, getOnlineState, () => true);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const refreshStarted = useRef(false);

  const syncInteractionState = useCallback(() => {
    setInteractionPaused(hasPausedInteraction());
  }, []);

  const refresh = useCallback(() => {
    const nextInteractionPaused = hasPausedInteraction();
    setInteractionPaused(nextInteractionPaused);

    const blockReason = getDashboardRefreshBlockReason({
      visible: document.visibilityState === "visible",
      online: navigator.onLine,
      interactionPaused: nextInteractionPaused,
      refreshing: refreshStarted.current,
    });
    if (blockReason) return;

    refreshStarted.current = true;
    setLastUpdatedAt(new Date());
    startTransition(() => router.refresh());
  }, [router]);

  useEffect(() => {
    const interval = window.setInterval(refresh, DASHBOARD_REFRESH_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const interactionObserver = new MutationObserver(syncInteractionState);
    interactionObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-live-refresh-pause"],
      childList: true,
      subtree: true,
    });

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      interactionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pathname, refresh, syncInteractionState]);

  useEffect(() => {
    if (!isPending && refreshStarted.current) {
      refreshStarted.current = false;
      setLastUpdatedAt(new Date());
      syncInteractionState();
    }
  }, [isPending, syncInteractionState]);

  const blockReason: DashboardRefreshBlockReason = !online
    ? "offline"
    : interactionPaused
      ? "interaction"
      : isPending
        ? "refreshing"
        : null;

  const label =
    blockReason === "offline"
      ? "Offline"
      : blockReason === "interaction"
        ? "Updates paused"
        : blockReason === "refreshing"
          ? "Updating"
          : "Live";
  const detail =
    blockReason === "offline"
      ? "Waiting for a connection"
      : blockReason === "interaction"
        ? "Finish or clear the current form"
        : lastUpdatedAt
          ? `Updated ${lastUpdatedAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}`
          : "Updates every 5 seconds";
  const Icon =
    blockReason === "offline"
      ? CloudOff
      : blockReason === "interaction"
        ? Pause
        : Radio;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-30 sm:bottom-5 sm:right-5">
      <div
        className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-card-foreground"
        role="status"
        aria-label={`${label}. ${detail}`}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "size-3.5",
            blockReason === "offline"
              ? "text-destructive"
              : blockReason === "interaction"
                ? "text-amber-400"
                : "text-emerald-400",
          )}
        />
        <div className="leading-tight">
          <p className="text-xs font-medium">{label}</p>
          <p className="text-[11px] text-muted-foreground" aria-hidden="true">
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
}
