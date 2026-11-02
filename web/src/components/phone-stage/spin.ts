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

/** How much of the visitor's own turn the phone copies, and the most it leans each way (radians). */
const GYRO = { gain: 0.9, x: 0.3, y: 0.5 };
/** A jump bigger than this (degrees) is the orientation angles wrapping round, not a real turn. */
const GYRO_WRAP = 60;
/** Seconds the rest pose takes to catch up with how the visitor now holds their phone. */
const GYRO_SETTLE = 2.5;

/** The visitor's phone in screen axes, in degrees: `h` the right edge turning away, `v` the top edge tipping away. */
export type Hold = { h: number; v: number };

/** Device orientation (`beta`, `gamma`) in screen axes, for a screen turned by `angle` degrees (0, 90, 180 or 270). */
export function holdFrom(beta: number, gamma: number, angle: number): Hold {
  switch (((angle % 360) + 360) % 360) {
    case 90:
      return { h: beta, v: -gamma };
    case 180:
      return { h: -gamma, v: -beta };
    case 270:
      return { h: -beta, v: gamma };
    default:
      return { h: gamma, v: beta };
  }
}

/**
 * Follows the visitor's own phone: the lean copies how far it has turned from the way it is usually held. The rest
 * pose drifts toward the current hold over a few seconds, so a phone held still at any angle lets the 3D phone settle.
 */
export function followHold(rest: Hold | null, hold: Hold, dt: number): { rest: Hold; lean: Lean } {
  if (!rest || Math.abs(hold.h - rest.h) > GYRO_WRAP || Math.abs(hold.v - rest.v) > GYRO_WRAP) return { rest: hold, lean: NO_LEAN };
  const k = 1 - Math.exp(-Math.max(dt, 0) / GYRO_SETTLE);
  const next = { h: rest.h + (hold.h - rest.h) * k, v: rest.v + (hold.v - rest.v) * k };
  const rad = (d: number) => (d * Math.PI) / 180;
  const clamp = (v: number, m: number) => Math.min(m, Math.max(-m, v));
  return {
    rest: next,
    // Right edge away turns the screen to the right (+y); top edge away tips it back (-x).
    lean: { x: clamp(-rad(hold.v - next.v) * GYRO.gain, GYRO.x), y: clamp(rad(hold.h - next.h) * GYRO.gain, GYRO.y) },
  };
}
