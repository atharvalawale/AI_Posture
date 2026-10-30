import { clipDuration, type PoseClip } from "./clip";
import { kneeAngle } from "./geometry";

export type Rep = { start: number; bottom: number; end: number; depth: number };

/**
 * Walks the clip and returns each completed rep.
 * A rep runs from the last time above `up`, through a dip below `down`,
 * to the next rise above `up`. These are the thresholds `RepCounter` uses.
 */
export function findReps(clip: PoseClip, opts: { down?: number; up?: number; step?: number } = {}): Rep[] {
  const down = opts.down ?? 115;
  const up = opts.up ?? 160;
  const step = opts.step ?? 1 / 30;
  const end = clipDuration(clip);
  const reps: Rep[] = [];
  let start = 0;
  let bent = false;
  let bottom = 0;
  let depth = Infinity;

  for (let t = 0; t <= end; t += step) {
    const angle = kneeAngle(clip, t);
    if (angle > up) {
      if (bent) {
        reps.push({ start, bottom, end: t, depth });
        bent = false;
        depth = Infinity;
      }
      start = t;
    } else if (angle < down) {
      bent = true;
    }
    if (bent && angle < depth) {
      depth = angle;
      bottom = t;
    }
  }
  return reps;
}

/** 100 at or below the target depth, then 2.2 points off per degree short of it. */
export function repScore(depth: number, target: number): number {
  return Math.min(100, Math.max(0, 100 - Math.max(0, depth - target) * 2.2));
}

/** Rounded mean rep score, or null when there are no reps. */
export function formScore(depths: readonly number[], target: number): number | null {
  if (depths.length === 0) return null;
  const total = depths.reduce((sum, d) => sum + repScore(d, target), 0);
  return Math.round(total / depths.length);
}

/** How many reps reached the target depth, comparing whole degrees as the screen shows them. */
export function reachedCount(depths: readonly number[], target: number): number {
  return depths.filter((d) => Math.round(d) <= target).length;
}
