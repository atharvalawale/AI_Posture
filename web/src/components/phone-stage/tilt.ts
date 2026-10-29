/** Rotation of the phone (radians, three.js convention) before the section reaches the top. */
export const START_TILT = { x: 0.35, y: -0.6 };
/** Gentle side to side sway while pinned. */
const SWAY = 0.12;
const SWAY_PERIOD = 7;
/** Story progress over which the sway fades in, so it starts from rest. */
const SWAY_RAMP = 0.08;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Phone rotation for story progress `p` (see useScrollStory) at time `t` seconds.
 * Tilted while the section scrolls in, face-on when pinned, then a slow sway.
 */
export function tiltAt(p: number, t: number): { x: number; y: number } {
  if (p < 0) {
    const k = clamp01(p + 1);
    const rest = 1 - k * k * (3 - 2 * k);
    return { x: START_TILT.x * rest, y: START_TILT.y * rest };
  }
  const amp = SWAY * clamp01(p / SWAY_RAMP);
  return { x: 0, y: amp * Math.sin((2 * Math.PI * t) / SWAY_PERIOD) };
}
