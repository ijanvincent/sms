import { describe, expect, it } from "vitest";

import {
  DASHBOARD_REFRESH_INTERVAL_MS,
  getDashboardRefreshBlockReason,
  type DashboardRefreshState,
} from "@/lib/dashboard-refresh";

const ready: DashboardRefreshState = {
  visible: true,
  online: true,
  interactionPaused: false,
  refreshing: false,
};

describe("dashboard refresh policy", () => {
  it("uses a five-second live update cadence", () => {
    expect(DASHBOARD_REFRESH_INTERVAL_MS).toBe(5_000);
  });

  it("allows refreshes while the visible dashboard is idle and online", () => {
    expect(getDashboardRefreshBlockReason(ready)).toBeNull();
  });

  it.each([
    ["hidden", { visible: false }],
    ["offline", { online: false }],
    ["interaction", { interactionPaused: true }],
    ["refreshing", { refreshing: true }],
  ] as const)("blocks refreshes when %s", (reason, override) => {
    expect(
      getDashboardRefreshBlockReason({ ...ready, ...override }),
    ).toBe(reason);
  });

  it("prioritizes offline feedback over an active interaction", () => {
    expect(
      getDashboardRefreshBlockReason({
        ...ready,
        online: false,
        interactionPaused: true,
      }),
    ).toBe("offline");
  });
});
