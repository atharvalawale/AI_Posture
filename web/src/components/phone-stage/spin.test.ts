import { describe, expect, it } from "vitest";
import { followHold, holdFrom, leanToward, NO_LEAN, REST, settle, step, type Lean, type SpinState } from "./spin";

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

describe("holdFrom", () => {
  it("maps the device axes to the screen for each rotation", () => {
    expect(holdFrom(40, 10, 0)).toEqual({ h: 10, v: 40 });
    expect(holdFrom(40, 10, 90)).toEqual({ h: 40, v: -10 });
    expect(holdFrom(40, 10, 180)).toEqual({ h: -10, v: -40 });
    expect(holdFrom(40, 10, -90)).toEqual({ h: -40, v: 10 });
  });
});

describe("followHold", () => {
  it("starts at rest", () => {
    expect(followHold(null, { h: 5, v: 50 }, 0.016)).toEqual({ rest: { h: 5, v: 50 }, lean: NO_LEAN });
  });

  it("copies a turn of the visitor's phone", () => {
    const { lean } = followHold({ h: 0, v: 50 }, { h: 10, v: 40 }, 0.016);
    expect(lean.y).toBeGreaterThan(0.1);
    expect(lean.x).toBeGreaterThan(0.1);
  });

  it("never leans past its limits", () => {
    const { lean } = followHold({ h: 0, v: 50 }, { h: 55, v: 0 }, 0.016);
    expect(lean).toEqual({ x: 0.3, y: 0.5 });
  });

  it("settles back to rest while the phone is held still", () => {
    let rest = { h: 0, v: 50 };
    let lean: Lean = NO_LEAN;
    for (let i = 0; i < 60 * 15; i++) ({ rest, lean } = followHold(rest, { h: 20, v: 50 }, 1 / 60));
    expect(Math.abs(lean.y)).toBeLessThan(0.01);
  });

  it("resets when the angles wrap round", () => {
    expect(followHold({ h: -80, v: 90 }, { h: 80, v: 90 }, 0.016).lean).toEqual(NO_LEAN);
  });
});
