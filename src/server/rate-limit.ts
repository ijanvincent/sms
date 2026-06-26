import { createFixedWindow } from "./fixed-window";

// Per-caller request rate limiting, built on the shared fixed-window primitive
// (which evicts expired keys so the map cannot grow unbounded). One window is
// used across the API; callers vary only the per-window limit.
const WINDOW_MS = 60_000;

const limiter = createFixedWindow(WINDOW_MS, { sweepIntervalMs: WINDOW_MS });

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number): RateLimitResult {
  const { count, retryAfterSeconds } = limiter.hit(key);
  if (count > limit) {
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
