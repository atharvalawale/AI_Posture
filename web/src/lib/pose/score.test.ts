// @vitest-environment node
import { describe, expect, it } from "vitest";
import fixture from "../../../public/media/squat.pose.json";
import type { PoseClip } from "./clip";
import { findReps, formScore, reachedCount, repScore } from "./score";

const clip = fixture as PoseClip;

describe("score", () => {
  it("finds the three real reps", () => {
    const reps = findReps(clip);
    expect(reps).toHaveLength(3);
    reps.forEach((r, i) => {
      expect(r.bottom).toBeCloseTo([3.0, 12.0, 25.4][i], 0);
      expect(r.start).toBeLessThan(r.bottom);
      expect(r.bottom).toBeLessThan(r.end);
    });
    expect(reps.map((r) => Math.round(r.depth))).toEqual([95, 102, 99]);
  });
  it("scores a rep against the target", () => {
    expect(repScore(95, 100)).toBe(100);
    expect(repScore(102, 100)).toBeCloseTo(95.6, 5);
    expect(repScore(160, 100)).toBe(0);
  });
  it("averages completed reps", () => {
    expect(formScore([], 100)).toBeNull();
    expect(formScore([95, 102, 100], 100)).toBe(99);
  });
  it("counts reps that reached the target after rounding", () => {
    const d = [95.1, 101.9, 99.5];
    expect(reachedCount(d, 100)).toBe(2);
    expect(reachedCount(d, 102)).toBe(3);
    expect(reachedCount(d, 85)).toBe(0);
    expect(reachedCount(d, 130)).toBe(3);
  });
});
