import { describe, expect, it } from "vitest";

import {
  checkLoginThrottle,
  clearLoginThrottle,
  recordFailedLogin,
} from "./login-throttle";

// The throttle keeps per-caller state in module singletons, so each test uses a
// unique key to stay isolated.
function uniqueKey(): string {
  return `ip-${Math.random().toString(36).slice(2)}`;
}

describe("recordFailedLogin", () => {
  it("counts remaining attempts down and locks at the limit", () => {
    const key = uniqueKey();

    expect(recordFailedLogin(key).attemptsRemaining).toBe(4);
    expect(recordFailedLogin(key).attemptsRemaining).toBe(3);
    expect(recordFailedLogin(key).attemptsRemaining).toBe(2);
    expect(recordFailedLogin(key).attemptsRemaining).toBe(1);

    const fifth = recordFailedLogin(key);
    expect(fifth.attemptsRemaining).toBe(0);
    expect(fifth.locked).toBe(true);
    expect(fifth.retryAfterSeconds).toBeGreaterThan(0);

    expect(checkLoginThrottle(key).locked).toBe(true);
  });

  it("is not locked while attempts remain", () => {
    const key = uniqueKey();
    expect(recordFailedLogin(key).locked).toBe(false);
    expect(checkLoginThrottle(key).locked).toBe(false);
  });
});

describe("clearLoginThrottle", () => {
  it("resets the caller's counter after a successful sign-in", () => {
    const key = uniqueKey();
    recordFailedLogin(key);
    recordFailedLogin(key);

    clearLoginThrottle(key);

    expect(checkLoginThrottle(key).locked).toBe(false);
    expect(recordFailedLogin(key).attemptsRemaining).toBe(4);
  });
});
