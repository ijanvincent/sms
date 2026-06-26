// Brute-force protection for the admin login endpoint. Counts *failed* sign-in
// attempts per caller within a fixed window and locks further attempts once the
// limit is reached; a successful sign-in clears the record so it never counts
// against a legitimate admin.
//
// In-memory and single-instance, matching the rest of this self-hosted gateway.
// A horizontally-scaled deployment should back this with a shared store (e.g.
// Redis) so the window is global across instances.
interface Attempts {
  count: number;
  resetAt: number;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60_000; // 5 minutes

const attempts = new Map<string, Attempts>();

export interface LoginThrottleState {
  locked: boolean;
  retryAfterSeconds: number;
}

export function checkLoginThrottle(key: string): LoginThrottleState {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now >= entry.resetAt) {
    return { locked: false, retryAfterSeconds: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return {
      locked: true,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return { locked: false, retryAfterSeconds: 0 };
}

export function recordFailedLogin(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now >= entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  entry.count += 1;
}

export function clearLoginThrottle(key: string): void {
  attempts.delete(key);
}
