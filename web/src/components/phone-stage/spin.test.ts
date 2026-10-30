import { describe, expect, it } from "vitest";
import { leanToward, NO_LEAN, REST, settle, step, type Lean, type SpinState } from "./spin";

function runUntilSettled(s: SpinState, lean: Lean = NO_LEAN) {
  for (let i = 0; i < 60 * 10; i++) {
    const done = settle(s, lean);
    if (done) return { state: done, seconds: i / 60 };
    s = step(s, lean, 1 / 60);
  }
  throw new Error("did not settle in 10 s");
}

describe("leanToward", () => {
  it("faces the pointer", () => {
    expect(leanToward(1, 0.5).y).toBeGreaterThan(0);
    expect(leanToward(0, 0.5).y).toBeLessThan(0);
    expect(leanToward(0.5, 0)).toEqual({ x: -0.16, y: 0 });
    expect(leanToward(0.5, 0.5)).toEqual({ x: 0, y: 0 });
  });
});

describe("spring", () => {
  it("returns to rest after a lean ends", () => {
    const { state } = runUntilSettled({ ...REST, y: 0.8 });
    expect(state).toEqual(REST);
  });

  it("settles within two seconds", () => {
    expect(runUntilSettled({ ...REST, y: 0.3, vy: 2 }).seconds).toBeLessThan(2);
  });

  it("rests on the lean while the pointer hovers", () => {
    const lean = leanToward(0.9, 0.2);
    const { state } = runUntilSettled(REST, lean);
    expect(state.x).toBe(lean.x);
    expect(state.y).toBe(lean.y);
  });
});
