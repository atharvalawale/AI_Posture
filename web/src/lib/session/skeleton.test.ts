// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { glide, lineWidth, PoseFeed, toElement, videoBox, visiblePose } from "./skeleton";

describe("videoBox and toElement", () => {
  // A 2:1 frame in a square element.
  it("crops the sides with object-fit cover", () => {
    const box = videoBox(400, 400, 800, 400, "cover", false);
    expect(box).toMatchObject({ ox: -200, oy: 0, w: 800, h: 400 });
    expect(toElement(box, 0.5, 0.5)).toEqual([200, 200]);
    // A quarter in from each side lands on the element's edges; the rest is cropped away.
    expect(toElement(box, 0.25, 0)).toEqual([0, 0]);
    expect(toElement(box, 0.75, 1)).toEqual([400, 400]);
  });

  it("letterboxes with object-fit contain", () => {
    const box = videoBox(400, 400, 800, 400, "contain", false);
    expect(box).toMatchObject({ ox: 0, oy: 100, w: 400, h: 200 });
    expect(toElement(box, 0, 0)).toEqual([0, 100]);
    expect(toElement(box, 1, 1)).toEqual([400, 300]);
  });

  it("mirrors around the element's center, with the same crop", () => {
    const cover = videoBox(400, 400, 800, 400, "cover", true);
    expect(toElement(cover, 0.25, 0.3)).toEqual([400, 120]);
    expect(toElement(cover, 0.75, 0.3)).toEqual([0, 120]);
    expect(toElement(cover, 0.5, 0.5)).toEqual([200, 200]);

    const contain = videoBox(400, 400, 800, 400, "contain", true);
    expect(toElement(contain, 0, 0)).toEqual([400, 100]);
    expect(toElement(contain, 0.1, 1)).toEqual([360, 300]);
  });

  it("maps a landscape camera into a portrait phone screen", () => {
    const box = videoBox(390, 844, 1280, 720, "cover", false);
    const [x, y] = toElement(box, 0.5, 0.25);
    expect(x).toBeCloseTo(195);
    expect(y).toBeCloseTo(211);
    const [mx] = toElement(videoBox(390, 844, 1280, 720, "cover", true), 0.45, 0.25);
    const [ux] = toElement(box, 0.55, 0.25);
    expect(mx).toBeCloseTo(ux);
  });
});

describe("lineWidth", () => {
  it("follows the visible part of the frame, at least 2", () => {
    expect(lineWidth(videoBox(390, 844, 1280, 720, "cover", false))).toBeCloseTo(390 / 160);
    expect(lineWidth(videoBox(960, 720, 1280, 720, "contain", true))).toBeCloseTo(540 / 160);
    expect(lineWidth(videoBox(200, 150, 1280, 720, "cover", false))).toBe(2);
  });
});

describe("visiblePose", () => {
  it("keeps landmarks seen better than the scorer's 0.5 and drops the rest", () => {
    expect(visiblePose([[0.1, 0.2, 0.9], [0.3, 0.4, 0.5], null, [0.5, 0.6, 0.51]])).toEqual([[0.1, 0.2], null, null, [0.5, 0.6]]);
    expect(visiblePose(null)).toBeNull();
    expect(visiblePose(undefined)).toBeNull();
  });
});

describe("glide", () => {
  const from = [[0, 0], [0.5, 0.5], null] as ([number, number] | null)[];
  const to = [[1, 0.5], null, [0.2, 0.2]] as ([number, number] | null)[];

  it("moves each landmark part of the way, shows new ones at once and drops lost ones", () => {
    expect(glide(from, to, 0.5)).toEqual([[0.5, 0.25], null, [0.2, 0.2]]);
    expect(glide(from, to, 0)).toEqual([[0, 0], null, [0.2, 0.2]]);
  });

  it("lands on the target, and clamps an early clock", () => {
    expect(glide(from, to, 1)).toBe(to);
    expect(glide(from, to, 3)).toBe(to);
    expect(glide(from, to, -0.5)).toEqual([[0, 0], null, [0.2, 0.2]]);
  });

  it("snaps when there is nothing to glide from, and clears when nobody is left", () => {
    expect(glide(null, to, 0.5)).toBe(to);
    expect(glide(from, null, 0.5)).toBeNull();
  });
});

describe("PoseFeed", () => {
  it("tells subscribers about each new pose and about clearing, once", () => {
    const feed = new PoseFeed();
    const listener = vi.fn();
    const unsubscribe = feed.subscribe(listener);
    feed.set(null);
    expect(listener).not.toHaveBeenCalled();
    feed.set([[0.1, 0.2, 0.9]]);
    expect(feed.get()).toEqual([[0.1, 0.2, 0.9]]);
    feed.set(null);
    feed.set(null);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    feed.set([[0.1, 0.2, 0.9]]);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
