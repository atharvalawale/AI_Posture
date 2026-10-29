/**
 * Rotation the visitor adds to the phone with their hands, on top of the scroll tilt.
 * Radians, three.js convention: positive `y` turns the screen to the right, positive `x` tilts
 * it down. A drag turns the phone, a flick spins it, and on release it springs back to the
 * nearest whole turn, so a hard flick ends face-on after one or more full spins.
 */
export type SpinState = {
  x: number;
  y: number;
  /** Velocity in radians per second. */
  vx: number;
  vy: number;
  /** The whole turn the phone comes to rest at after a release. */
  base: number;
};

/** A small lean toward the pointer while it hovers over the phone. */
export type Lean = { x: number; y: number };

export const TURN = Math.PI * 2;
export const REST: SpinState = { x: 0, y: 0, vx: 0, vy: 0, base: 0 };
export const NO_LEAN: Lean = { x: 0, y: 0 };

/** Dragging across the phone's full width turns it half a turn. */
const YAW_PER_WIDTH = Math.PI;
/** Pitch is limited: the phone tips toward and away from the visitor, it does not flip. */
export const MAX_PITCH = 0.45;
const LEAN = { x: 0.16, y: 0.3 };
/** Spring back. Slightly under critically damped (2 x sqrt(38) = 12.3) for one soft overshoot. */
const STIFFNESS = 38;
const DAMPING = 9;
/** How far ahead a flick is projected when picking the turn it comes to rest at, in seconds. */
const LOOKAHEAD = 0.3;

/** Soft limit: follows `v` near zero and eases into +-max. */
export function rubber(v: number, max: number): number {
  return Number.isFinite(max) ? max * Math.tanh(v / max) : v;
}

/** Lean for a pointer at (`px`, `py`), each 0..1 across the phone. Faces the pointer. */
export function leanToward(px: number, py: number): Lean {
  return { x: (py - 0.5) * 2 * LEAN.x, y: (px - 0.5) * 2 * LEAN.y };
}

/** Rotation while dragging, `dx`, `dy` CSS pixels from where the drag started at `from`. */
export function dragAngles(from: { x: number; y: number }, dx: number, dy: number, width: number, maxYaw: number): { x: number; y: number } {
  return {
    x: rubber(from.x + (dy / width) * YAW_PER_WIDTH * 0.5, MAX_PITCH),
    y: rubber(from.y + (dx / width) * YAW_PER_WIDTH, maxYaw),
  };
}

/** Picks the whole turn a released phone comes to rest at. */
export function release(s: SpinState, maxYaw: number): SpinState {
  if (Number.isFinite(maxYaw)) return { ...s, base: 0 };
  return { ...s, base: Math.round((s.y + s.vy * LOOKAHEAD) / TURN) * TURN };
}

/** One step of the spring toward `base` plus the lean. `dt` in seconds. */
export function step(s: SpinState, lean: Lean, dt: number): SpinState {
  const h = Math.min(dt, 1 / 30);
  const ax = -STIFFNESS * (s.x - lean.x) - DAMPING * s.vx;
  const ay = -STIFFNESS * (s.y - s.base - lean.y) - DAMPING * s.vy;
  const vx = s.vx + ax * h;
  const vy = s.vy + ay * h;
  return { x: s.x + vx * h, y: s.y + vy * h, vx, vy, base: s.base };
}

/** At rest on its target. Snaps there and drops the whole turns, so angles never grow. */
export function settle(s: SpinState, lean: Lean): SpinState | null {
  const still = Math.abs(s.vx) < 0.01 && Math.abs(s.vy) < 0.01;
  const there = Math.abs(s.x - lean.x) < 1e-3 && Math.abs(s.y - s.base - lean.y) < 1e-3;
  return still && there ? { x: lean.x, y: lean.y, vx: 0, vy: 0, base: 0 } : null;
}
