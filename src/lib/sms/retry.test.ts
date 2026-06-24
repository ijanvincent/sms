import { describe, expect, it } from "vitest";

import { resolveFailure } from "./retry";

describe("resolveFailure", () => {
  it("requeues as PENDING while attempts remain", () => {
    expect(resolveFailure(1, 3)).toEqual({ status: "PENDING", requeue: true });
    expect(resolveFailure(2, 3)).toEqual({ status: "PENDING", requeue: true });
  });

  it("gives up as FAILED at the attempt boundary", () => {
    expect(resolveFailure(3, 3)).toEqual({ status: "FAILED", requeue: false });
  });

  it("gives up when attempts exceed the max", () => {
    expect(resolveFailure(4, 3)).toEqual({ status: "FAILED", requeue: false });
  });

  it("fails immediately when only one attempt is allowed", () => {
    expect(resolveFailure(1, 1)).toEqual({ status: "FAILED", requeue: false });
  });
});
