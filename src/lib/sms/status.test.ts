import { describe, expect, it } from "vitest";

import { ALL_MESSAGE_STATUSES, isMessageStatus } from "./status";

describe("isMessageStatus", () => {
  it.each(["PENDING", "CLAIMED", "SENT", "FAILED"])(
    "accepts the known status %s",
    (value) => {
      expect(isMessageStatus(value)).toBe(true);
    },
  );

  it.each(["pending", "UNKNOWN", "", "Sent "])(
    "rejects the unknown string %s",
    (value) => {
      expect(isMessageStatus(value)).toBe(false);
    },
  );

  it.each([null, undefined, 123, {}, []])(
    "rejects the non-string %s",
    (value) => {
      expect(isMessageStatus(value)).toBe(false);
    },
  );
});

describe("ALL_MESSAGE_STATUSES", () => {
  it("contains exactly the four lifecycle states", () => {
    expect(ALL_MESSAGE_STATUSES).toEqual([
      "PENDING",
      "CLAIMED",
      "SENT",
      "FAILED",
    ]);
  });
});
