/** Rotation of the phone (radians, three.js convention) when the page loads, before it turns in. */
export const START_TILT = { x: 0.35, y: -0.6 };
/**
 * Where the phone rests once it has turned in: a little to one side, so its edge and depth show.
 * Face-on, the 3D phone reads as a flat picture.
 */
export const REST_TILT = { x: 0.08, y: 0.28 };
/** How long the phone takes to turn in to its rest after the page loads, in milliseconds. */
export const INTRO_MS = 1200;
/** Gentle side to side sway while pinned, driven by scroll so the phone rests when the page does. */
const SWAY = 0.12;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The turn-in as the page loads: eases from START_TILT to REST_TILT over INTRO_MS. `ms` since it started. */
export function introTilt(ms: number): { x: number; y: number } {
  const k = clamp01(ms / INTRO_MS);
  if (k === 1) return REST_TILT;
  const left = 1 - k * k * (3 - 2 * k);
  return { x: REST_TILT.x + (START_TILT.x - REST_TILT.x) * left, y: REST_TILT.y + (START_TILT.y - REST_TILT.y) * left };
}

/** Whether the turn-in is still running `ms` after it started. */
export function introRunning(ms: number): boolean {
  return ms < INTRO_MS;
}

/** One slow sway right and left across the story (progress `p`, 0 to 1), added to the rest. None at both ends. */
export function swayAt(p: number): { x: number; y: number } {
  return { x: 0, y: SWAY * Math.sin(2 * Math.PI * clamp01(p)) };
}
