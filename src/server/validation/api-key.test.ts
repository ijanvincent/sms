import { describe, expect, it } from "vitest";

import { API_KEY_SCOPE } from "@/lib/auth/api-key-scope";
import { createApiKeySchema } from "./api-key";

const valid = { label: "Android sender", scope: API_KEY_SCOPE.GATEWAY };

describe("createApiKeySchema", () => {
  it("accepts a label and scope with no quota", () => {
    const parsed = createApiKeySchema.parse(valid);
    expect(parsed).toEqual({ label: "Android sender", scope: "gateway" });
  });

  it("trims surrounding whitespace from the label", () => {
    const parsed = createApiKeySchema.parse({ ...valid, label: "  padded  " });
    expect(parsed.label).toBe("padded");
  });

  it("rejects a label that is only whitespace", () => {
    expect(createApiKeySchema.safeParse({ ...valid, label: "   " }).success).toBe(
      false,
    );
  });

  it("rejects a label longer than 80 characters", () => {
    const result = createApiKeySchema.safeParse({
      ...valid,
      label: "x".repeat(81),
    });
    expect(result.success).toBe(false);
  });

  it.each(["admin", "CLIENT", "", "gateways"])(
    "rejects the unknown scope %s",
    (scope) => {
      expect(createApiKeySchema.safeParse({ ...valid, scope }).success).toBe(false);
    },
  );

  it("treats null quota as unlimited", () => {
    const parsed = createApiKeySchema.parse({ ...valid, dailyQuota: null });
    expect(parsed.dailyQuota).toBeNull();
  });

  it.each([0, -1, 1.5])("rejects the invalid quota %s", (dailyQuota) => {
    expect(createApiKeySchema.safeParse({ ...valid, dailyQuota }).success).toBe(
      false,
    );
  });

  it("accepts a positive integer quota", () => {
    expect(createApiKeySchema.parse({ ...valid, dailyQuota: 500 }).dailyQuota).toBe(
      500,
    );
  });
});
