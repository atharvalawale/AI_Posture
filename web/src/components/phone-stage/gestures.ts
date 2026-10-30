import { BEZEL, PHONE_H, PHONE_W } from "@/components/phone/PhoneFrame";

/** A press shorter and smaller than this is a tap, not a scrub. */
export const TAP = { ms: 350, px: 6 };

/** A press that stayed put and let go quickly. `moved` in CSS pixels, `ms` in milliseconds. */
export function isTap(moved: number, ms: number): boolean {
  return moved < TAP.px && ms < TAP.ms;
}

/** A move that starts a scrub: past the tap slop and clearly more sideways than vertical, so a page-scroll swipe never does. */
export function isScrub(dx: number, dy: number): boolean {
  return Math.abs(dx) > TAP.px && Math.abs(dx) > 1.5 * Math.abs(dy);
}

/** Fractions over the phone body (0..1 each) to design pixels on the screen, inside the bezel. */
export function phonePointToScreen(px: number, py: number): { x: number; y: number } {
  return { x: px * PHONE_W - BEZEL, y: py * PHONE_H - BEZEL };
}
