// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../../../public/media/squat.pose.json";
import { LiveSession, RESUME_MS, STEP_SECONDS, SCRUB_PER_WIDTH, hipAngle, type PoseClip, type VideoLike } from "./index";

const clip = fixture as PoseClip;
const fakeVideo = () => ({ currentTime: 0, duration: 29.27, paused: true, play: vi.fn(async () => {}), pause: vi.fn() }) satisfies VideoLike;
const feed = (s: LiveSession, v: VideoLike, to: number) => {
  for (let i = 0; i / 30 <= to; i++) s.frame(i / 30, v);
};

describe("LiveSession", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("exports the constants", () => {
    expect([SCRUB_PER_WIDTH, STEP_SECONDS, RESUME_MS]).toEqual([8, 0.25, 900]);
  });

  it("is empty before a clip is set", () => {
    const s = new LiveSession();
    const v = fakeVideo();
    s.attach(v);
    s.frame(1, v);
    expect(s.getSnapshot().value).toBeNull();
    expect(s.getSnapshot().t).toBe(0);
  });

  it("counts the three reps, depths and form over the whole clip", () => {
    const s = new LiveSession(clip);
    const v = fakeVideo();
    s.attach(v);
    feed(s, v, 29.2);
    const st = s.getSnapshot();
    expect(st.reps).toBe(3);
    expect(st.depths.map(Math.round)).toEqual([95, 102, 99]);
    expect(st.form).toBe(99);
    expect(st.extreme).toBe(95);
  });

  it("switches joint: hip value and back extreme", () => {
    const s = new LiveSession(clip);
    const v = fakeVideo();
    s.attach(v);
    feed(s, v, 29.2);
    s.setJoint("hip");
    s.frame(3, v);
    expect(s.getSnapshot().value).toBe(Math.round(hipAngle(clip, 3)));
    s.setJoint("back");
    expect(s.getSnapshot().extreme).toBeGreaterThan(38);
    expect(s.getSnapshot().extreme).toBeLessThan(46);
  });

  it("cycles joints", () => {
    const s = new LiveSession(clip);
    const seen = [s.getSnapshot().joint];
    for (let i = 0; i < 3; i++) { s.cycleJoint(); seen.push(s.getSnapshot().joint); }
    expect(seen).toEqual(["knee", "hip", "back", "knee"]);
  });

  it("resets on a backward jump", () => {
    const s = new LiveSession(clip);
    const v = fakeVideo();
    s.attach(v);
    feed(s, v, 29.2);
    s.frame(28.2, v);
    const st = s.getSnapshot();
    expect(st.reps).toBe(0);
    expect(st.depths).toEqual([]);
    expect(st.form).toBeNull();
  });

  it("ignores frames from a source that is not attached", () => {
    const s = new LiveSession(clip);
    const a = fakeVideo(), b = fakeVideo();
    s.attach(a);
    s.frame(2, a);
    const before = s.getSnapshot();
    s.frame(5, b);
    expect(s.getSnapshot()).toBe(before);
  });

  it("keeps the same snapshot and does not notify when nothing changed", () => {
    const s = new LiveSession(clip);
    const v = fakeVideo();
    s.attach(v);
    s.frame(2, v);
    const fn = vi.fn();
    s.subscribe(fn);
    const before = s.getSnapshot();
    s.frame(2, v);
    expect(s.getSnapshot()).toBe(before);
    expect(fn).not.toHaveBeenCalled();
    s.frame(2.1, v);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(s.getSnapshot()).not.toBe(before);
  });

  it("scrubs relative to the start, then resumes after the delay", () => {
    const s = new LiveSession(clip);
    const v = fakeVideo();
    s.attach(v);
    s.frame(2, v);
    s.beginScrub();
    expect(v.pause).toHaveBeenCalled();
    expect(s.getSnapshot().scrubbing).toBe(true);
    s.scrubTo(140, 280);
    expect(v.currentTime).toBe(6);
    s.endScrub();
    expect(s.getSnapshot().scrubbing).toBe(false);
    vi.advanceTimersByTime(899);
    expect(v.play).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(v.play).toHaveBeenCalledTimes(1);
  });

  it("a new scrub cancels a pending resume", () => {
    const s = new LiveSession(clip);
    const v = fakeVideo();
    s.attach(v);
    s.beginScrub();
    s.endScrub();
    s.beginScrub();
    vi.advanceTimersByTime(2000);
    expect(v.play).not.toHaveBeenCalled();
  });

  it("steps and clamps", () => {
    const s = new LiveSession(clip);
    const v = fakeVideo();
    s.attach(v);
    s.frame(1, v);
    s.step(1);
    expect(v.currentTime).toBeCloseTo(1.25);
    s.frame(0.1, v);
    s.step(-1);
    expect(v.currentTime).toBe(0);
    vi.advanceTimersByTime(RESUME_MS);
    expect(v.play).toHaveBeenCalledTimes(1);
  });

  it("treats a non-finite duration as no upper bound", () => {
    for (const duration of [NaN, Infinity]) {
      const s = new LiveSession(clip);
      const v = { ...fakeVideo(), duration };
      s.attach(v);
      expect(() => s.step(1)).not.toThrow();
      expect(v.currentTime).toBeCloseTo(0.25);
      expect(() => s.scrubTo(100, 280)).not.toThrow();
      expect(Number.isFinite(v.currentTime)).toBe(true);
    }
  });

  it("keeps rapid steps that arrive before the next frame", () => {
    const s = new LiveSession(clip);
    const v = fakeVideo();
    s.attach(v);
    s.frame(1, v);
    s.step(1);
    s.step(1);
    expect(v.currentTime).toBeCloseTo(1.5);
  });

  it("dispose clears the pending resume and subscribers", () => {
    const s = new LiveSession(clip);
    const v = fakeVideo();
    s.attach(v);
    const fn = vi.fn();
    s.subscribe(fn);
    s.step(1);
    s.dispose();
    vi.advanceTimersByTime(2000);
    expect(v.play).not.toHaveBeenCalled();
    s.setJoint("hip");
    expect(fn).not.toHaveBeenCalled();
  });

  it("swallows a rejected play()", async () => {
    const s = new LiveSession(clip);
    const v = fakeVideo();
    v.play = vi.fn(async () => { throw new Error("blocked"); });
    s.attach(v);
    s.endScrub();
    vi.advanceTimersByTime(RESUME_MS);
    await Promise.resolve();
    expect(v.play).toHaveBeenCalled();
  });

  it("seeks a newly attached video to the session time", () => {
    const s = new LiveSession(clip);
    const a = fakeVideo(), b = fakeVideo();
    s.attach(a);
    s.frame(4, a);
    s.attach(b);
    expect(b.currentTime).toBe(4);
  });

  it("detach stops the video driving", () => {
    const s = new LiveSession(clip);
    const a = fakeVideo();
    const detach = s.attach(a);
    detach();
    s.frame(3, a);
    expect(s.getSnapshot().t).toBe(0);
  });

  it("loops back to the start of the range", () => {
    const s = new LiveSession(clip);
    const v = fakeVideo();
    s.attach(v);
    s.loop([2, 4]);
    expect(v.currentTime).toBe(2);
    s.frame(4.1, v);
    expect(v.currentTime).toBe(2);
  });
});
