import { describe, expect, it } from "vitest";
import { isScrub, isTap, phonePointToScreen, TAP } from "./gestures";

describe("isTap", () => {
  it("is a short press that barely moved", () => {
    expect(TAP).toEqual({ ms: 350, px: 6 });
    expect(isTap(5, 200)).toBe(true);
  });

  it("is not a tap once it moved too far or lasted too long", () => {
    expect(isTap(7, 200)).toBe(false);
    expect(isTap(2, 400)).toBe(false);
  });
});

describe("phonePointToScreen", () => {
  it("maps fractions over the phone body to design pixels on the screen", () => {
    expect(phonePointToScreen(0.5, 0.5)).toEqual({ x: 140, y: 305 });
  });
});

describe("isScrub", () => {
  it("starts on a clearly sideways move", () => {
    expect(isScrub(10, 2)).toBe(true);
    expect(isScrub(-10, 2)).toBe(true);
  });

  it("does not start on a diagonal swipe that is about to scroll the page", () => {
    expect(isScrub(8, 14)).toBe(false);
  });

  it("does not start within the tap slop", () => {
    expect(isScrub(5, 0)).toBe(false);
  });
});
