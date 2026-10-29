// @vitest-environment node
import { describe, expect, it } from "vitest";
import fixture from "../../../public/media/squat.pose.json";
import { RepCounter, clipDuration, coverBox, keypoint, kneeAngle, type PoseClip } from "./index";

const clip = fixture as PoseClip;

describe("pose clip", () => {
  it("starts standing", () => {
    expect(kneeAngle(clip, 0)).toBeGreaterThan(170);
  });

  it("reaches squat depth", () => {
    let min = 180;
    for (let t = 0; t <= 29; t += 0.1) min = Math.min(min, kneeAngle(clip, t));
    expect(min).toBeGreaterThan(90);
    expect(min).toBeLessThan(105);
  });

  it("counts three reps over the whole clip", () => {
    const counter = new RepCounter();
    let reps = 0;
    for (let t = 0; t <= clipDuration(clip); t += 1 / 30) reps = counter.update(kneeAngle(clip, t)).reps;
    expect(reps).toBe(3);
  });

  it("clamps keypoints at the last frame", () => {
    const last = ((clip.n - 1) * clip.step) / clip.fps;
    expect(keypoint(clip, 1e6, 25)).toEqual(keypoint(clip, last, 25));
  });

  it("interpolates between samples", () => {
    const a = keypoint(clip, 0, 25);
    const b = keypoint(clip, clip.step / clip.fps, 25);
    const mid = keypoint(clip, clip.step / clip.fps / 2, 25);
    expect(mid[0]).toBeCloseTo((a[0] + b[0]) / 2, 6);
    expect(mid[1]).toBeCloseTo((a[1] + b[1]) / 2, 6);
  });

  it("throws for a landmark the clip does not have", () => {
    expect(() => keypoint(clip, 0, 5)).toThrow();
  });
});

describe("coverBox", () => {
  it("matches object-fit: cover with an object position", () => {
    const box = coverBox(400, 640, 720, 1366, 0.5, 0.85);
    expect(box.w).toBe(400);
    expect(box.h).toBeCloseTo(758.9, 1);
    expect(box.ox).toBe(0);
    expect(box.oy).toBeCloseTo(-101.1, 1);
  });

  it("centers by default", () => {
    const box = coverBox(1000, 500, 720, 1366);
    expect(box.w).toBe(1000);
    expect(box.oy).toBeCloseTo((500 - box.h) / 2, 6);
  });
});

describe("RepCounter", () => {
  const cycle = (c: RepCounter) => {
    c.update(170);
    c.update(100);
    return c.update(170).reps;
  };

  it("wraps after the target", () => {
    const c = new RepCounter({ target: 2 });
    expect([cycle(c), cycle(c), cycle(c)]).toEqual([1, 2, 1]);
  });

  it("needs to go below down and back above up", () => {
    const c = new RepCounter();
    c.update(170);
    c.update(120);
    expect(c.update(170).reps).toBe(0);
    c.update(110);
    expect(c.update(150).reps).toBe(0);
    expect(c.update(161).reps).toBe(1);
  });

  it("picks cues from the angle and direction", () => {
    const c = new RepCounter();
    expect(c.update(175).cue).toBe("Stand tall to begin");
    expect(c.update(150).cue).toBe("Lower slowly");
    // Same angle again (a repeated animation frame) keeps the last direction.
    expect(c.update(150).cue).toBe("Lower slowly");
    expect(c.update(105).cue).toBe("Good depth, hold");
    expect(c.update(140).cue).toBe("Push up through your heels");
    expect(c.update(175).cue).toBe("Good rep. Stand tall");
  });

  it("resets", () => {
    const c = new RepCounter();
    cycle(c);
    c.reset();
    expect(c.update(175)).toEqual({ reps: 0, cue: "Stand tall to begin" });
  });
});
