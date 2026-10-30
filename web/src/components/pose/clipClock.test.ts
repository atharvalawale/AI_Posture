import { describe, expect, it } from "vitest";
import { ClipClock, clipTime } from "./clipClock";

describe("clipTime", () => {
  it("loops the elapsed time over the clip", () => {
    expect(clipTime(0, 29.27)).toBe(0);
    expect(clipTime(30_000, 29.27)).toBeCloseTo(0.73, 2);
    expect(clipTime(1_500, 29.27)).toBeCloseTo(1.5, 5);
  });

  it("stays at 0 for a clip with no length", () => {
    expect(clipTime(5_000, 0)).toBe(0);
    expect(clipTime(5_000, Number.NaN)).toBe(0);
  });
});

describe("ClipClock", () => {
  it("runs on the given clock only while playing, and loops", async () => {
    let now = 1_000;
    const clock = new ClipClock(() => now);
    clock.duration = 10;
    expect(clock.paused).toBe(true);
    expect(clock.currentTime).toBe(0);

    await clock.play();
    now += 2_500;
    expect(clock.currentTime).toBeCloseTo(2.5, 5);

    clock.pause();
    now += 5_000;
    expect(clock.currentTime).toBeCloseTo(2.5, 5);

    await clock.play();
    now += 9_000;
    expect(clock.currentTime).toBeCloseTo(1.5, 5);
  });

  it("seeks", async () => {
    let now = 0;
    const clock = new ClipClock(() => now);
    clock.duration = 10;
    clock.currentTime = 4;
    expect(clock.currentTime).toBe(4);
    await clock.play();
    now += 1_000;
    expect(clock.currentTime).toBeCloseTo(5, 5);
    clock.currentTime = 1;
    now += 500;
    expect(clock.currentTime).toBeCloseTo(1.5, 5);
  });

  it("loops inside a range, playing into it from an earlier seek", async () => {
    let now = 0;
    const clock = new ClipClock(() => now);
    clock.duration = 30;
    clock.setRange([2, 10]);
    clock.seek(1);
    await clock.play();
    now += 3_000;
    expect(clock.currentTime).toBeCloseTo(4, 5);
    now += 7_000;
    // 11 s is 1 s past the end, so 1 s after the start of the range.
    expect(clock.currentTime).toBeCloseTo(3, 5);
  });
});
