import { describe, expect, it } from "vitest";

import { disconnectSchema } from "@/server/validation/gateway";

describe("disconnectSchema", () => {
  it("accepts a configured device ID", () => {
    expect(disconnectSchema.safeParse({ deviceId: "device_123" }).success).toBe(true);
  });

  it("rejects a missing or empty device ID", () => {
    expect(disconnectSchema.safeParse({}).success).toBe(false);
    expect(disconnectSchema.safeParse({ deviceId: "" }).success).toBe(false);
  });
});
