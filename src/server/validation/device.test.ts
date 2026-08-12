import { describe, expect, it } from "vitest";

import { createDeviceSchema } from "./device";

describe("createDeviceSchema", () => {
  it("accepts a bare name", () => {
    expect(createDeviceSchema.parse({ name: "Honor" }).name).toBe("Honor");
  });

  it("trims the name", () => {
    expect(createDeviceSchema.parse({ name: "  Honor  " }).name).toBe("Honor");
  });

  it.each(["", "   "])("rejects the empty name %s", (name) => {
    expect(createDeviceSchema.safeParse({ name }).success).toBe(false);
  });

  it("rejects a name longer than 60 characters", () => {
    expect(createDeviceSchema.safeParse({ name: "x".repeat(61) }).success).toBe(
      false,
    );
  });

  it("keeps carrier and SIM when provided", () => {
    const parsed = createDeviceSchema.parse({
      name: "Honor",
      carrier: "TM",
      simNumber: "09171234567",
    });
    expect(parsed).toEqual({
      name: "Honor",
      carrier: "TM",
      simNumber: "09171234567",
    });
  });

  it("converts blank optional fields to null so the column stays nullable", () => {
    const parsed = createDeviceSchema.parse({
      name: "Honor",
      carrier: "  ",
      simNumber: "",
    });
    expect(parsed.carrier).toBeNull();
    expect(parsed.simNumber).toBeNull();
  });

  it("rejects an over-long carrier", () => {
    expect(
      createDeviceSchema.safeParse({ name: "Honor", carrier: "x".repeat(31) })
        .success,
    ).toBe(false);
  });
});
