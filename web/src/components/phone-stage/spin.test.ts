import { describe, expect, it } from "vitest";
import { dragAngles, leanToward, MAX_PITCH, NO_LEAN, release, REST, rubber, settle, step, TURN, type Lean, type SpinState } from "./spin";

function runUntilSettled(s: SpinState, lean: Lean = NO_LEAN) {
  for (let i = 0; i < 60 * 10; i++) {
    const done = settle(s, lean);
    if (done) return { state: done, seconds: i / 60 };
    s = step(s, lean, 1 / 60);
  }
  throw new Error("did not settle in 10 s");
}

describe("rubber", () => {
  it("follows small values and never passes the limit", () => {
    expect(rubber(0.01, 0.5)).toBeCloseTo(0.01, 3);
    expect(rubber(100, 0.5)).toBeLessThanOrEqual(0.5);
    expect(rubber(-100, 0.5)).toBeGreaterThanOrEqual(-0.5);
  });

  it("has no limit when the max is infinite", () => {
    expect(rubber(20, Infinity)).toBe(20);
  });
});

describe("dragAngles", () => {
  it("turns half a turn for a drag across the phone's width", () => {
    expect(dragAngles({ x: 0, y: 0 }, 300, 0, 300, Infinity).y).toBeCloseTo(Math.PI);
  });

  it("keeps the pitch within its limit", () => {
    expect(Math.abs(dragAngles({ x: 0, y: 0 }, 0, 5000, 300, Infinity).x)).toBeLessThanOrEqual(MAX_PITCH);
  });

  it("limits the yaw when the phone has no back to show", () => {
    expect(dragAngles({ x: 0, y: 0 }, 3000, 0, 300, 0.6).y).toBeLessThanOrEqual(0.6);
  });
});

describe("leanToward", () => {
  it("faces the pointer", () => {
    expect(leanToward(1, 0.5).y).toBeGreaterThan(0);
    expect(leanToward(0, 0.5).y).toBeLessThan(0);
    expect(leanToward(0.5, 0)).toEqual({ x: -0.16, y: 0 });
    expect(leanToward(0.5, 0.5)).toEqual({ x: 0, y: 0 });
  });
});

describe("release and spring back", () => {
  it("returns face-on after a small drag", () => {
    const { state } = runUntilSettled(release({ ...REST, y: 0.8 }, Infinity));
    expect(state).toEqual(REST);
  });

  it("completes the turn after a flick and settles within two seconds", () => {
    const flicked = release({ ...REST, y: 2.5, vy: 12 }, Infinity);
    expect(flicked.base).toBe(TURN);
    const { state, seconds } = runUntilSettled(flicked);
    expect(state.y).toBe(0);
    expect(seconds).toBeLessThan(2);
  });

  it("never spins past its limit when the yaw is limited", () => {
    expect(release({ ...REST, y: 0.5, vy: 40 }, 0.6).base).toBe(0);
  });

  it("rests on the lean while the pointer hovers", () => {
    const lean = leanToward(0.9, 0.2);
    const { state } = runUntilSettled(REST, lean);
    expect(state.x).toBe(lean.x);
    expect(state.y).toBe(lean.y);
  });
});
