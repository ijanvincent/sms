import { describe, expect, it } from "vitest";

import {
  DEVICE_ONLINE_WINDOW_MS,
  isDeviceOnline,
} from "@/lib/sms/device";

describe("device presence", () => {
  const now = new Date("2026-08-12T05:30:00.000Z").getTime();

  it("allows three missed five-second polls before marking a device offline", () => {
    expect(DEVICE_ONLINE_WINDOW_MS).toBe(15_000);
  });

  it("treats a recent heartbeat as online", () => {
    expect(isDeviceOnline(new Date(now - 10_000), now)).toBe(true);
  });

  it("treats an expired or missing heartbeat as offline", () => {
    expect(isDeviceOnline(new Date(now - 15_001), now)).toBe(false);
    expect(isDeviceOnline(null, now)).toBe(false);
  });
});
