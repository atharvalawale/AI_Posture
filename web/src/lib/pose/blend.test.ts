// @vitest-environment node
import { describe, expect, it } from "vitest";
import fixture from "../../../public/media/squat.pose.json";
import { blendForKnee, blendPose, deepestPose, poseAngle, standingPose, weekDepths } from "./blend";
import type { PoseClip } from "./clip";
import { kneeAngle } from "./geometry";

const clip = fixture as PoseClip;
const r = clip.h / clip.w;

describe("blend", () => {
  it("weeks deepen from a shallow squat to the clip's full depth", () => {
    const d = weekDepths(clip);
    expect(d).toHaveLength(6);
    expect(d[0]).toBeGreaterThan(135);
    expect(d[0]).toBeLessThan(145);
    for (let i = 1; i < 6; i++) expect(d[i]).toBeLessThan(d[i - 1]);
    expect(d[5]).toBeCloseTo(kneeAngle(clip, deepestPose(clip).t), 1);
  });
  it("finds the blend for the 100° target", () => {
    const k = blendForKnee(clip, 100);
    const p = blendPose(standingPose(clip), deepestPose(clip).pose, k);
    expect(Math.abs(poseAngle(p, 23, 25, 27, r) - 100)).toBeLessThan(0.5);
  });
  it("blend ends are the two poses", () => {
    const a = standingPose(clip),
      b = deepestPose(clip).pose;
    expect(blendPose(a, b, 0)).toEqual(a);
    expect(blendPose(a, b, 1)).toEqual(b);
  });
});
