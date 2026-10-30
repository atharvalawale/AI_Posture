import { describe, expect, it } from "vitest";
import { INTRO_MS, START_TILT, introTilt, swayAt } from "./tilt";

describe("introTilt", () => {
  it("starts at the start tilt and turns face-on by the end of the intro", () => {
    expect(introTilt(0)).toEqual(START_TILT);
    expect(introTilt(INTRO_MS)).toEqual({ x: 0, y: 0 });
  });

  it("stays face-on after the intro and eases in between", () => {
    expect(introTilt(INTRO_MS * 3)).toEqual({ x: 0, y: 0 });
    const mid = introTilt(INTRO_MS / 2);
    expect(mid.x).toBeCloseTo(START_TILT.x / 2);
    expect(mid.y).toBeCloseTo(START_TILT.y / 2);
  });
});

describe("swayAt", () => {
  it("sways right and left once across the story", () => {
    expect(swayAt(0).y).toBeCloseTo(0);
    expect(swayAt(0.25).y).toBeCloseTo(0.12);
    expect(swayAt(0.75).y).toBeCloseTo(-0.12);
    expect(swayAt(1).y).toBeCloseTo(0);
    expect(swayAt(0.5).x).toBe(0);
  });
});
