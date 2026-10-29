/** Rotation of the phone (radians, three.js convention) before the section reaches the top. */
export const START_TILT = { x: 0.35, y: -0.6 };
/** Gentle side to side sway while pinned, driven by scroll so the phone rests when the page does. */
const SWAY = 0.12;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Phone rotation for story progress `p` (see useScrollStory).
 * Tilted while the section scrolls in, face-on as it pins, then one slow sway right and left
 * across the story, back to face-on at the end.
 */
export function tiltAt(p: number): { x: number; y: number } {
  if (p < 0) {
    const k = clamp01(p + 1);
    const rest = 1 - k * k * (3 - 2 * k);
    return { x: START_TILT.x * rest, y: START_TILT.y * rest };
  }
  return { x: 0, y: SWAY * Math.sin(2 * Math.PI * clamp01(p)) };
}
