import { describe, expect, it } from "vitest";
import { angleGeometry, exercisePose, measuredAngle, poseFor, type ExercisePose } from "./exercise-pose";
import { EXERCISES } from "./protocol";

const pose: ExercisePose = {
  w: 1200,
  h: 900,
  side: "left",
  joints: ["hip", "knee", "ankle"],
  points: [
    [400, 300],
    [600, 500],
    [900, 500],
  ],
  angle: 135,
  landmarks: [[25, 600, 500, 0.99]],
};

describe("exercise poses", () => {
  it("has a photo pose for every exercise, with the angle matching its points", () => {
    for (const { key } of EXERCISES) {
      const p = exercisePose(key);
      expect(p.w).toBe(1200);
      expect(p.h).toBe(900);
      const [a, b, c] = p.points;
      const u = [a[0] - b[0], a[1] - b[1]];
      const v = [c[0] - b[0], c[1] - b[1]];
      const deg = (Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]))) * 180) / Math.PI;
      expect(Math.abs(deg - p.angle)).toBeLessThanOrEqual(1);
    }
  });
});

describe("poseFor", () => {
  it("keeps the photo's own side as it is", () => {
    const p = poseFor(pose, "left");
    expect(p.mirrored).toBe(false);
    expect(p.points[1]).toEqual([600, 500]);
  });

  it("mirrors points and landmarks for the other side", () => {
    const p = poseFor(pose, "right");
    expect(p.mirrored).toBe(true);
    expect(p.points[0]).toEqual([800, 300]);
    expect(p.landmarks[0]).toEqual([600, 500]);
  });
});

describe("angleGeometry", () => {
  it("draws the arc at radius r and points the label away from the angle", () => {
    const { arc, out } = angleGeometry(pose.points, 100);
    // Starts 100 units from the knee toward the hip, ends 100 units toward the ankle.
    expect(arc).toBe(`M ${(600 - 100 / Math.SQRT2).toFixed(1)} ${(500 - 100 / Math.SQRT2).toFixed(1)} A 100 100 0 0 1 700.0 500.0`);
    // The limbs open up and to the right, so the label goes down and to the left.
    expect(out[0]).toBeLessThan(0);
    expect(out[1]).toBeGreaterThan(0);
  });

  it("puts the label above a straight limb", () => {
    expect(
      angleGeometry(
        [
          [0, 0],
          [100, 0],
          [200, 0],
        ],
        10,
      ).out,
    ).toEqual([0, -1]);
  });
});

describe("measuredAngle", () => {
  it("is the angle between the limbs for most exercises", () => {
    expect(measuredAngle("knee_extension", 163, pose.points)).toEqual({ degrees: 163, arcPoints: pose.points, reference: null, label: null });
  });

  it("measures a straight leg raise as the lift off the floor, against the torso line", () => {
    const lying: [[number, number], [number, number], [number, number]] = [
      [200, 600],
      [500, 600],
      [800, 300],
    ];
    const m = measuredAngle("straight_leg_raise", 135, lying, 100);
    expect(m.degrees).toBe(45);
    expect(m.reference).toEqual([600, 600]);
    expect(m.arcPoints).toEqual([[600, 600], lying[1], lying[2]]);
    // The leg rises above the floor line, so the reading sits below it.
    expect(m.label?.at).toEqual([610, 600]);
    expect(m.label?.dir[0]).toBeCloseTo(0);
    expect(m.label?.dir[1]).toBe(1);
  });
});
