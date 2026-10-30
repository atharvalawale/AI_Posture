/**
 * The lean the visitor adds to the phone by pointing at it, on top of the scroll tilt.
 * Radians, three.js convention: positive `y` turns the screen to the right, positive `x` tilts
 * it down. A spring carries the phone toward the lean, with one soft overshoot.
 */
export type SpinState = {
  x: number;
  y: number;
  /** Velocity in radians per second. */
  vx: number;
  vy: number;
};

/** A small lean toward the pointer while it hovers over the phone. */
export type Lean = { x: number; y: number };

export const REST: SpinState = { x: 0, y: 0, vx: 0, vy: 0 };
export const NO_LEAN: Lean = { x: 0, y: 0 };

const LEAN = { x: 0.16, y: 0.3 };
/** Spring back. Slightly under critically damped (2 x sqrt(38) = 12.3) for one soft overshoot. */
const STIFFNESS = 38;
const DAMPING = 9;

/** Lean for a pointer at (`px`, `py`), each 0..1 across the phone. Faces the pointer. */
export function leanToward(px: number, py: number): Lean {
  return { x: (py - 0.5) * 2 * LEAN.x, y: (px - 0.5) * 2 * LEAN.y };
}

/** One step of the spring toward the lean. `dt` in seconds. */
export function step(s: SpinState, lean: Lean, dt: number): SpinState {
  const h = Math.min(dt, 1 / 30);
  const ax = -STIFFNESS * (s.x - lean.x) - DAMPING * s.vx;
  const ay = -STIFFNESS * (s.y - lean.y) - DAMPING * s.vy;
  const vx = s.vx + ax * h;
  const vy = s.vy + ay * h;
  return { x: s.x + vx * h, y: s.y + vy * h, vx, vy };
}

/** At rest on the lean. Snaps there so the spring stops. */
export function settle(s: SpinState, lean: Lean): SpinState | null {
  const still = Math.abs(s.vx) < 0.01 && Math.abs(s.vy) < 0.01;
  const there = Math.abs(s.x - lean.x) < 1e-3 && Math.abs(s.y - lean.y) < 1e-3;
  return still && there ? { x: lean.x, y: lean.y, vx: 0, vy: 0 } : null;
}
