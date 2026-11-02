import { keypoint, type PoseClip } from "./clip";
import { angleAt, jointAngle, kneeAngle, type Box } from "./geometry";

export type JointId = "knee" | "hip" | "back";
export const JOINT_IDS: readonly JointId[] = ["knee", "hip", "back"];

export type JointMeasure = {
  id: JointId;
  name: string;
  sub: string;
  target: number;
  goal: string;
  range: [number, number];
  extreme: "min" | "max";
  extremeLabel: string;
  /** Landmark where the angle is drawn. */
  vertex: number;
};

/** A measure whose goal is the physio's target, written from the target itself so the two never disagree. */
const physioTarget = (m: Omit<JointMeasure, "goal">): JointMeasure => ({ ...m, goal: `Your physio's target: ${m.target}°` });

export const MEASURES: Record<JointId, JointMeasure> = {
  knee: physioTarget({ id: "knee", name: "Knee", sub: "bend, measured live", target: 100, range: [90, 180], extreme: "min", extremeLabel: "Deepest", vertex: 25 }),
  hip: physioTarget({ id: "hip", name: "Hip", sub: "hinge, measured live", target: 90, range: [60, 180], extreme: "min", extremeLabel: "Deepest", vertex: 23 }),
  back: { id: "back", name: "Back", sub: "lean from upright", target: 45, goal: "Keep it under 45°", range: [0, 60], extreme: "max", extremeLabel: "Most lean", vertex: 11 },
};

/** Left hip angle: shoulder (11), hip (23), knee (25). */
export function hipAngle(clip: PoseClip, t: number): number {
  return jointAngle(clip, t, 11, 23, 25);
}

/** Lean of the hip (23) to shoulder (11) line from vertical, in degrees. Corrects for aspect ratio. */
export function trunkLean(clip: PoseClip, t: number): number {
  const hip = keypoint(clip, t, 23);
  const shoulder = keypoint(clip, t, 11);
  const above: [number, number] = [hip[0], hip[1] - 1];
  return angleAt(shoulder, hip, above, clip.h / clip.w);
}

/** The live value for a joint, in degrees. */
export function measure(clip: PoseClip, t: number, joint: JointId): number {
  if (joint === "knee") return kneeAngle(clip, t);
  if (joint === "hip") return hipAngle(clip, t);
  return trunkLean(clip, t);
}

const CANDIDATES: [JointId, number][] = [["knee", 25], ["hip", 23], ["back", 11]];

/** The joint closest to (x, y) within `maxDist`, in the same pixel space as `box`. */
export function nearestJoint(clip: PoseClip, t: number, box: Box, x: number, y: number, maxDist: number): JointId | null {
  let best: JointId | null = null;
  let bestDist = maxDist;
  for (const [id, k] of CANDIDATES) {
    const [kx, ky] = keypoint(clip, t, k);
    const d = Math.hypot(box.ox + kx * box.w - x, box.oy + ky * box.h - y);
    if (d <= bestDist) {
      best = id;
      bestDist = d;
    }
  }
  return best;
}
