import { describe, expect, it } from "vitest";
import { INTRO_MS, REST_TILT, START_TILT, introRunning, introTilt, swayAt } from "./tilt";

describe("introTilt", () => {
  it("starts at the start tilt and turns to its rest by the end of the intro", () => {
    expect(introTilt(0)).toEqual(START_TILT);
    expect(introTilt(INTRO_MS)).toEqual(REST_TILT);
  });

  it("stays at rest after the intro and eases in between", () => {
    expect(introTilt(INTRO_MS * 3)).toEqual(REST_TILT);
    const mid = introTilt(INTRO_MS / 2);
    expect(mid.x).toBeCloseTo((START_TILT.x + REST_TILT.x) / 2);
    expect(mid.y).toBeCloseTo((START_TILT.y + REST_TILT.y) / 2);
  });

  it("rests turned enough that the phone's depth shows, never face-on", () => {
    expect(Math.abs(REST_TILT.y)).toBeGreaterThan(0.2);
  });

  it("runs until the intro ends", () => {
    expect(introRunning(0)).toBe(true);
    expect(introRunning(INTRO_MS - 1)).toBe(true);
    expect(introRunning(INTRO_MS)).toBe(false);
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
