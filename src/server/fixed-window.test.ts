import { describe, expect, it } from "vitest";

import { createFixedWindow } from "./fixed-window";

// A controllable clock so window behavior is deterministic without real timers.
function fakeClock(start = 0) {
  let nowMs = start;
  return {
    now: () => nowMs,
    advance: (ms: number) => {
      nowMs += ms;
    },
  };
}

describe("createFixedWindow", () => {
  it("counts hits within the window", () => {
    const clock = fakeClock();
    const window = createFixedWindow(1000, { now: clock.now });

    expect(window.hit("a").count).toBe(1);
    expect(window.hit("a").count).toBe(2);
    expect(window.hit("a").count).toBe(3);
  });

  it("tracks keys independently", () => {
    const clock = fakeClock();
    const window = createFixedWindow(1000, { now: clock.now });

    window.hit("a");
    window.hit("a");
    expect(window.hit("b").count).toBe(1);
    expect(window.peek("a").count).toBe(2);
  });

  it("resets the count once the window elapses", () => {
    const clock = fakeClock();
    const window = createFixedWindow(1000, { now: clock.now });

    window.hit("a");
    window.hit("a");
    clock.advance(1000);
    expect(window.hit("a").count).toBe(1);
  });

  it("reports retryAfterSeconds rounded up to the window end", () => {
    const clock = fakeClock();
    const window = createFixedWindow(1000, { now: clock.now });

    window.hit("a");
    clock.advance(250);
    expect(window.peek("a").retryAfterSeconds).toBe(1); // 750ms remaining → ceil
  });

  it("peek does not record a hit and is zero for unknown keys", () => {
    const clock = fakeClock();
    const window = createFixedWindow(1000, { now: clock.now });

    expect(window.peek("missing")).toEqual({
      count: 0,
      resetAt: 0,
      retryAfterSeconds: 0,
    });
    window.hit("a");
    expect(window.peek("a").count).toBe(1);
    expect(window.peek("a").count).toBe(1);
  });

  it("reset forgets the key", () => {
    const clock = fakeClock();
    const window = createFixedWindow(1000, { now: clock.now });

    window.hit("a");
    window.hit("a");
    window.reset("a");
    expect(window.peek("a").count).toBe(0);
  });

  it("sweep evicts only expired keys", () => {
    const clock = fakeClock();
    const window = createFixedWindow(1000, { now: clock.now });

    window.hit("old");
    clock.advance(600);
    window.hit("fresh");
    clock.advance(500); // old is now expired (1100ms), fresh is not (500ms)
    window.sweep();

    expect(window.peek("old").count).toBe(0);
    expect(window.peek("fresh").count).toBe(1);
  });
});
