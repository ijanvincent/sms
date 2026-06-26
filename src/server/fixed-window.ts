// Shared in-memory fixed-window counter. Tracks event counts per key within a
// fixed time window and evicts expired keys so the map cannot grow unbounded —
// the single primitive behind both API rate limiting and login throttling.
//
// In-memory and single-instance, matching this self-hosted gateway. A
// horizontally-scaled deployment should back this with a shared store (e.g.
// Redis) so the window is global across instances. Counters also reset on
// process restart; security-sensitive callers should pair this with a durable
// control (see the global backstop in login-throttle.ts).
interface WindowEntry {
  count: number;
  resetAt: number;
}

export interface WindowState {
  count: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export interface FixedWindowOptions {
  // Injectable clock; defaults to Date.now. Primarily for deterministic tests.
  now?: () => number;
  // When set, an unref'd timer periodically evicts expired keys so idle keys do
  // not linger between accesses.
  sweepIntervalMs?: number;
}

export interface FixedWindow {
  // Records one event for `key` and returns the resulting window state.
  hit(key: string): WindowState;
  // Reads the current state for `key` without recording an event.
  peek(key: string): WindowState;
  // Forgets `key` entirely (e.g. on a successful sign-in).
  reset(key: string): void;
  // Evicts every expired key. Called automatically when sweepIntervalMs is set.
  sweep(): void;
}

export function createFixedWindow(
  windowMs: number,
  options: FixedWindowOptions = {},
): FixedWindow {
  const now = options.now ?? Date.now;
  const entries = new Map<string, WindowEntry>();

  function toState(entry: WindowEntry | undefined): WindowState {
    if (!entry) return { count: 0, resetAt: 0, retryAfterSeconds: 0 };
    return {
      count: entry.count,
      resetAt: entry.resetAt,
      retryAfterSeconds: Math.max(0, Math.ceil((entry.resetAt - now()) / 1000)),
    };
  }

  // Returns the live entry for `key`, lazily evicting it if its window elapsed.
  function live(key: string): WindowEntry | undefined {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (now() >= entry.resetAt) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  }

  function hit(key: string): WindowState {
    const entry = live(key);
    if (!entry) {
      const fresh: WindowEntry = { count: 1, resetAt: now() + windowMs };
      entries.set(key, fresh);
      return toState(fresh);
    }
    entry.count += 1;
    return toState(entry);
  }

  function peek(key: string): WindowState {
    return toState(live(key));
  }

  function reset(key: string): void {
    entries.delete(key);
  }

  function sweep(): void {
    const ts = now();
    for (const [key, entry] of entries) {
      if (ts >= entry.resetAt) entries.delete(key);
    }
  }

  if (options.sweepIntervalMs) {
    const timer = setInterval(sweep, options.sweepIntervalMs);
    // Never let the sweep timer hold the process open.
    timer.unref?.();
  }

  return { hit, peek, reset, sweep };
}
