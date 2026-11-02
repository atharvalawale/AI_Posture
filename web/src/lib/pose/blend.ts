import { keypoint, type PoseClip } from "./clip";
import { angleAt } from "./geometry";
import { findReps } from "./score";

/** Normalized x and y per landmark id in the clip. */
export type Pose = Record<number, [number, number]>;

/** Recovery weeks shown by the slider. */
export const WEEKS = 6;
/** Blend fraction between standing and the deepest squat reached in week 1 (about 142 degrees at the knee). */
export const WEEK1_BLEND = 0.52;

/** Every landmark in the clip at time `t`. */
export function poseAt(clip: PoseClip, t: number): Pose {
  const pose: Pose = {};
  for (const id of clip.k) pose[id] = keypoint(clip, t, id);
  return pose;
}

/** Linear blend from pose `a` (k = 0) to pose `b` (k = 1). */
export function blendPose(a: Pose, b: Pose, k: number): Pose {
  const out: Pose = {};
  for (const key of Object.keys(a)) {
    const id = Number(key);
    out[id] = [a[id][0] + (b[id][0] - a[id][0]) * k, a[id][1] + (b[id][1] - a[id][1]) * k];
  }
  return out;
}

/** Angle at landmark `b` between `a` and `c` in a pose. `aspect` is clip.h / clip.w. */
export function poseAngle(pose: Pose, a: number, b: number, c: number, aspect: number): number {
  return angleAt(pose[a], pose[b], pose[c], aspect);
}

/** The first sample of the clip, standing. */
export function standingPose(clip: PoseClip): Pose {
  return poseAt(clip, 0);
}

/** The bottom of the deepest rep in the clip. */
export function deepestPose(clip: PoseClip): { pose: Pose; t: number } {
  const reps = findReps(clip);
  if (reps.length === 0) throw new Error("No reps found in this pose clip");
  const deepest = reps.reduce((best, rep) => (rep.depth < best.depth ? rep : best));
  return { pose: poseAt(clip, deepest.bottom), t: deepest.bottom };
}

/** Blend fraction for a recovery week out of `weeks`: `WEEK1_BLEND` at week 1, 1 at the last week. */
export function weekBlend(week: number, weeks = WEEKS): number {
  if (weeks <= 1) return 1;
  return WEEK1_BLEND + ((1 - WEEK1_BLEND) * (week - 1)) / (weeks - 1);
}

/** The pose shown for a recovery week out of `weeks`. */
export function weekPose(clip: PoseClip, week: number, weeks = WEEKS): Pose {
  return blendPose(standingPose(clip), deepestPose(clip).pose, weekBlend(week, weeks));
}

/** Knee angle of each week's pose, weeks 1 to `weeks`, not rounded. The last week reaches the clip's full depth. */
export function weekDepths(clip: PoseClip, weeks = WEEKS): number[] {
  const r = clip.h / clip.w;
  return Array.from({ length: weeks }, (_, i) => poseAngle(weekPose(clip, i + 1, weeks), 23, 25, 27, r));
}

/** Blend fraction whose knee angle equals `angle`, found by bisection. Clamped to 0..1 if out of range. */
export function blendForKnee(clip: PoseClip, angle: number): number {
  const a = standingPose(clip);
  const b = deepestPose(clip).pose;
  const r = clip.h / clip.w;
  const knee = (k: number) => poseAngle(blendPose(a, b, k), 23, 25, 27, r);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    // The knee angle shrinks as the blend moves toward the deepest pose.
    if (knee(mid) > angle) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
