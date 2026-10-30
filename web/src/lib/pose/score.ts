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

/**
 * Which way a measure improves. A knee bend is lower-is-better: the smaller the angle, the deeper the squat.
 * An arm or leg raise is higher-is-better.
 */
export type Direction = "lower" | "higher";

/** Degrees a value falls short of the target, or 0 when it reached it. */
function shortBy(value: number, target: number, direction: Direction): number {
  return Math.max(0, direction === "lower" ? value - target : target - value);
}

/** 100 at or past the target, then 2.2 points off per degree short of it. */
export function repScore(value: number, target: number, direction: Direction = "lower"): number {
  return Math.min(100, Math.max(0, 100 - shortBy(value, target, direction) * 2.2));
}

/** Rounded mean rep score, or null when there are no reps. */
export function formScore(values: readonly number[], target: number, direction: Direction = "lower"): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, v) => sum + repScore(v, target, direction), 0);
  return Math.round(total / values.length);
}

/** True when a rep reached the target, comparing whole degrees as the screen shows them. */
export function reached(value: number, target: number, direction: Direction = "lower"): boolean {
  return shortBy(Math.round(value), target, direction) === 0;
}

/** How many reps reached the target, comparing whole degrees as the screen shows them. */
export function reachedCount(values: readonly number[], target: number, direction: Direction = "lower"): number {
  return values.filter((v) => reached(v, target, direction)).length;
}

/** The reps that fell short of the target, by index, with the value rounded as the screen shows it. */
export function shortReps(values: readonly number[], target: number, direction: Direction = "lower"): { rep: number; value: number }[] {
  return values.flatMap((v, rep) => (reached(v, target, direction) ? [] : [{ rep, value: Math.round(v) }]));
}
