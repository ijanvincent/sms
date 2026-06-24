import { describe, expect, it } from "vitest";

import { isValidPhMobile, normalizePhMobile } from "./phone";

describe("normalizePhMobile", () => {
  const valid: Array<[string, string]> = [
    ["09171234567", "+639171234567"],
    ["+639171234567", "+639171234567"],
    ["639171234567", "+639171234567"],
    ["9171234567", "+639171234567"],
    ["  0917 123 4567  ", "+639171234567"],
    ["+63 917 123 4567", "+639171234567"],
    ["0917-123-4567", "+639171234567"],
    ["09871234567", "+639871234567"],
  ];

  it.each(valid)("normalizes %s to %s", (input, expected) => {
    expect(normalizePhMobile(input)).toBe(expected);
  });

  const invalid = [
    "",
    "   ",
    "12345",
    "8171234567", // 10 digits but not starting with 9
    "08171234567", // 11 digits, subscriber would start with 8
    "091712345678", // too long
    "639171234", // too short
    "+1234567890", // non-PH country code
    "00639171234567", // not a recognised PH form
    "abcdefghij",
  ];

  it.each(invalid)("rejects %s", (input) => {
    expect(normalizePhMobile(input)).toBeNull();
  });
});

describe("isValidPhMobile", () => {
  it("is true for a valid number", () => {
    expect(isValidPhMobile("09171234567")).toBe(true);
  });

  it("is false for an invalid number", () => {
    expect(isValidPhMobile("8171234567")).toBe(false);
  });
});
