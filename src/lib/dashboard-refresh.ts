export const DASHBOARD_REFRESH_INTERVAL_MS = 5_000;

export interface DashboardRefreshState {
  visible: boolean;
  online: boolean;
  interactionPaused: boolean;
  refreshing: boolean;
}

export type DashboardRefreshBlockReason =
  | "hidden"
  | "offline"
  | "interaction"
  | "refreshing"
  | null;

export function getDashboardRefreshBlockReason({
  visible,
  online,
  interactionPaused,
  refreshing,
}: DashboardRefreshState): DashboardRefreshBlockReason {
  if (!visible) return "hidden";
  if (!online) return "offline";
  if (interactionPaused) return "interaction";
  if (refreshing) return "refreshing";
  return null;
}
