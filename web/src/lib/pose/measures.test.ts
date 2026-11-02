// @vitest-environment node
import { describe, expect, it } from "vitest";
import fixture from "../../../public/media/squat.pose.json";
import { MEASURES, clipDuration, coverBox, hipAngle, keypoint, kneeAngle, measure, nearestJoint, trunkLean, type PoseClip } from "./index";

const clip = fixture as PoseClip;
const sweep = (f: (t: number) => number) => { const v: number[] = []; for (let t = 0; t <= clipDuration(clip); t += 1 / 30) v.push(f(t)); return v; };

describe("joint measures", () => {
  it("hip starts open and hinges to about 82°", () => {
    expect(hipAngle(clip, 0)).toBeGreaterThan(170);
    const min = Math.min(...sweep((t) => hipAngle(clip, t)));
    expect(min).toBeGreaterThan(78);
    expect(min).toBeLessThan(86);
  });
  it("trunk starts upright and leans up to about 42°", () => {
    expect(trunkLean(clip, 0)).toBeLessThan(10);
    const max = Math.max(...sweep((t) => trunkLean(clip, t)));
    expect(max).toBeGreaterThan(38);
    expect(max).toBeLessThan(46);
  });
  it("measure picks the joint", () => {
    expect(measure(clip, 3, "knee")).toBe(kneeAngle(clip, 3));
    expect(measure(clip, 3, "hip")).toBe(hipAngle(clip, 3));
    expect(measure(clip, 3, "back")).toBe(trunkLean(clip, 3));
  });
  it("nearestJoint picks the closest of knee, hip and shoulder within the distance", () => {
    const box = coverBox(280, 610, clip.w, clip.h);
    const px = (k: number) => { const [x, y] = keypoint(clip, 3, k); return [box.ox + x * box.w, box.oy + y * box.h] as const; };
    const [kx, ky] = px(25), [hx, hy] = px(23), [sx, sy] = px(11);
    expect(nearestJoint(clip, 3, box, kx + 5, ky, 48)).toBe("knee");
    expect(nearestJoint(clip, 3, box, hx, hy - 10, 48)).toBe("hip");
    expect(nearestJoint(clip, 3, box, sx, sy, 48)).toBe("back");
    expect(nearestJoint(clip, 3, box, kx + 200, ky, 48)).toBeNull();
  });
  it("knee goal reads like the mockup", () => {
    expect(MEASURES.knee.goal).toBe("Your physio's target: 100°");
  });
});
