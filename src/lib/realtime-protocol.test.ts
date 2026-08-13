import { describe, expect, it } from "vitest";

import {
  eventForAudience,
  nextReconnectDelay,
  parseCookieHeader,
} from "@/lib/realtime-protocol";

describe("realtime protocol", () => {
  it("turns pending messages into gateway wake-ups", () => {
    expect(
      eventForAudience(
        { type: "message.changed", messageId: "m1", status: "PENDING" },
        "gateway",
      ),
    ).toMatchObject({ type: "queue.available", version: 1 });
  });

  it("does not wake gateways for terminal message or device changes", () => {
    expect(
      eventForAudience(
        { type: "message.changed", messageId: "m1", status: "SENT" },
        "gateway",
      ),
    ).toBeNull();
    expect(
      eventForAudience({ type: "device.changed", deviceId: "d1" }, "gateway"),
    ).toBeNull();
  });

  it("signals dashboard clients for every database event", () => {
    expect(
      eventForAudience({ type: "device.changed", deviceId: "d1" }, "dashboard"),
    ).toMatchObject({ type: "dashboard.changed", version: 1 });
  });

  it("parses cookies without truncating values containing equals signs", () => {
    expect(parseCookieHeader("a=one; sms_session=header.payload=sig").get("sms_session"))
      .toBe("header.payload=sig");
  });

  it("caps exponential reconnect delay", () => {
    expect(nextReconnectDelay(1_000, 30_000)).toBe(2_000);
    expect(nextReconnectDelay(20_000, 30_000)).toBe(30_000);
  });
});
