// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../../../public/media/squat.pose.json";
import { LiveSession, POSTER_KNEE, RESUME_MS, STEP_SECONDS, SCRUB_PER_WIDTH, hipAngle, kneeAngle, type PoseClip, type VideoLike } from "./index";

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

  it("can start on the poster, the clip's first frame, with its knee angle", () => {
    expect(POSTER_KNEE).toBe(Math.round(kneeAngle(clip, 0)));
    const s = new LiveSession(null, { poster: true });
    expect(s.getSnapshot()).toMatchObject({ t: 0, joint: "knee", value: POSTER_KNEE, knee: POSTER_KNEE, reps: 0, extreme: null, form: null });
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
    fn.mockClear();
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

  it("keeps a newly attached video paused while a scrub or a step is in progress", () => {
    const s = new LiveSession(clip);
    const a = fakeVideo(), b = fakeVideo(), c = fakeVideo();
    s.attach(a);
    s.frame(4, a);
    s.beginScrub();
    expect(s.holding()).toBe(true);
    s.attach(b);
    expect(b.pause).toHaveBeenCalled();
    s.endScrub();
    s.step(1);
    s.attach(c);
    expect(c.pause).toHaveBeenCalled();
    // The pending resume plays the video that is attached by then.
    vi.advanceTimersByTime(RESUME_MS);
    expect(c.play).toHaveBeenCalled();
  });

  it("leaves a newly attached video alone when nothing holds the clip", () => {
    const s = new LiveSession(clip);
    const a = fakeVideo(), b = fakeVideo();
    s.attach(a);
    s.frame(4, a);
    s.attach(b);
    expect(s.holding()).toBe(false);
    expect(b.pause).not.toHaveBeenCalled();
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

  it("plays when a range is picked or cleared, since the pick is a user gesture", async () => {
    const s = new LiveSession(clip);
    const v = fakeVideo();
    v.play = vi.fn(async () => { throw new Error("blocked"); });
    s.attach(v);
    s.loop([2, 4]);
    expect(v.play).toHaveBeenCalledTimes(1);
    s.loop(null);
    expect(v.play).toHaveBeenCalledTimes(2);
    // A blocked play is swallowed, not thrown.
    await Promise.resolve();
  });

  it("is driven by the visitor only while they scrub, step or pick a joint, and calms down after", () => {
    const s = new LiveSession(clip);
    const v = fakeVideo();
    s.attach(v);
    feed(s, v, 12);
    expect(s.getSnapshot().driven).toBe(false);

    s.beginScrub();
    expect(s.getSnapshot().driven).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(s.getSnapshot().driven).toBe(true);
    s.endScrub();
    vi.advanceTimersByTime(RESUME_MS);
    expect(s.getSnapshot().driven).toBe(false);

    s.step(1);
    expect(s.getSnapshot().driven).toBe(true);
    vi.advanceTimersByTime(RESUME_MS);
    expect(s.getSnapshot().driven).toBe(false);

    s.setJoint("hip");
    expect(s.getSnapshot().driven).toBe(true);
    vi.advanceTimersByTime(RESUME_MS);
    expect(s.getSnapshot().driven).toBe(false);

    // Frames from the clip playing on its own never count as the visitor.
    feed(s, v, 20);
    expect(s.getSnapshot().driven).toBe(false);
  });

  it("setting the same clip again keeps the count", () => {
    const s = new LiveSession();
    const v = fakeVideo();
    s.attach(v);
    s.setClip(clip);
    feed(s, v, 29.2);
    s.setClip(clip);
    expect(s.getSnapshot().reps).toBe(3);
  });

  it("holds still at a time with the reps before it counted, for reduced motion", () => {
    const s = new LiveSession(clip);
    const v = fakeVideo();
    s.attach(v);
    s.setStill(true);
    s.holdAt(20);
    const st = s.getSnapshot();
    expect(v.pause).toHaveBeenCalled();
    expect(v.currentTime).toBe(20);
    expect(st.t).toBe(20);
    expect(st.value).not.toBeNull();
    expect(st.reps).toBeGreaterThan(0);
    expect(st.form).not.toBeNull();
    expect(v.play).not.toHaveBeenCalled();
  });

  it("never plays on its own after a scrub or a step while still", () => {
    const s = new LiveSession(clip);
    const v = fakeVideo();
    s.attach(v);
    s.setStill(true);
    s.beginScrub();
    s.scrubTo(70, 280);
    s.endScrub();
    s.step(1);
    vi.advanceTimersByTime(5000);
    expect(v.play).not.toHaveBeenCalled();
    expect(s.holding()).toBe(false);
    // Picking a range is the visitor asking for it to play.
    s.loop([2, 4]);
    expect(v.play).toHaveBeenCalledTimes(1);
  });
});
