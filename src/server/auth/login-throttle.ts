import { createFixedWindow } from "@/server/fixed-window";

// Brute-force protection for the admin login endpoint, built on the shared
// fixed-window primitive (which evicts expired keys so the maps cannot grow
// unbounded).
//
// Two layers:
//  1. Per-caller — counts failed sign-ins per client key (IP) and locks once the
//     limit is reached. A successful sign-in clears the caller so it never
//     counts against a legitimate admin.
//  2. Global backstop — a single spoof-proof counter across *all* callers. The
//     per-caller key derives from `X-Forwarded-For`, which an attacker on an
//     untrusted network can rotate to dodge the per-caller lock; the global
//     ceiling still trips under such a distributed attack. It is set high enough
//     that a single legitimate admin will never reach it.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60_000; // 15 minutes — project auth-attempt policy

const GLOBAL_KEY = "__all__";
const GLOBAL_MAX_ATTEMPTS = 50;
const GLOBAL_WINDOW_MS = 15 * 60_000; // 15 minutes

const perCaller = createFixedWindow(WINDOW_MS, { sweepIntervalMs: WINDOW_MS });
const global = createFixedWindow(GLOBAL_WINDOW_MS, {
  sweepIntervalMs: GLOBAL_WINDOW_MS,
});

export interface LoginThrottleState {
  locked: boolean;
  retryAfterSeconds: number;
}

export interface FailedLoginResult extends LoginThrottleState {
  // How many sign-in attempts remain before the caller is locked out.
  attemptsRemaining: number;
}

export function checkLoginThrottle(key: string): LoginThrottleState {
  const caller = perCaller.peek(key);
  if (caller.count >= MAX_ATTEMPTS) {
    return { locked: true, retryAfterSeconds: caller.retryAfterSeconds };
  }

  const all = global.peek(GLOBAL_KEY);
  if (all.count >= GLOBAL_MAX_ATTEMPTS) {
    return { locked: true, retryAfterSeconds: all.retryAfterSeconds };
  }

  return { locked: false, retryAfterSeconds: 0 };
}

// Records a failed attempt and reports how many remain (so the UI can surface
// "N attempt(s) remaining") and whether this attempt tripped the lock.
export function recordFailedLogin(key: string): FailedLoginResult {
  const caller = perCaller.hit(key);
  const all = global.hit(GLOBAL_KEY);

  const lockedByCaller = caller.count >= MAX_ATTEMPTS;
  const lockedByGlobal = all.count >= GLOBAL_MAX_ATTEMPTS;

  return {
    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - caller.count),
    locked: lockedByCaller || lockedByGlobal,
    retryAfterSeconds:
      lockedByGlobal && !lockedByCaller
        ? all.retryAfterSeconds
        : caller.retryAfterSeconds,
  };
}

export function clearLoginThrottle(key: string): void {
  // Only the caller's own counter is cleared; the global backstop is system-wide
  // and is left to age out on its own.
  perCaller.reset(key);
}
