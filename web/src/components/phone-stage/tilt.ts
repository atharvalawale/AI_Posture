/** Rotation of the phone (radians, three.js convention) when the page loads, before it turns in. */
export const START_TILT = { x: 0.35, y: -0.6 };
/** How long the phone takes to turn in to face-on after the page loads, in milliseconds. */
export const INTRO_MS = 1200;
/** Gentle side to side sway while pinned, driven by scroll so the phone rests when the page does. */
const SWAY = 0.12;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The turn-in as the page loads: eases from START_TILT to face-on over INTRO_MS. `ms` since it started. */
export function introTilt(ms: number): { x: number; y: number } {
  const k = clamp01(ms / INTRO_MS);
  if (k === 1) return { x: 0, y: 0 };
  const rest = 1 - k * k * (3 - 2 * k);
  return { x: START_TILT.x * rest, y: START_TILT.y * rest };
}

/** One slow sway right and left across the story (progress `p`, 0 to 1), face-on at both ends. */
export function swayAt(p: number): { x: number; y: number } {
  return { x: 0, y: SWAY * Math.sin(2 * Math.PI * clamp01(p)) };
}
