"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/components/showcase/useShowcase";
import { clipDuration, findReps, type PoseClip, type VideoLike } from "@/lib/pose";

/** Seconds into a looping clip of `duration` seconds after `elapsedMs` of playing. 0 for a clip with no length. */
export function clipTime(elapsedMs: number, duration: number): number {
  if (!(duration > 0)) return 0;
  return (elapsedMs / 1000) % duration;
}

/**
 * A stand-in for a playing video when there is only pose data: a looping clock that
 * `LiveSession.attach` accepts. Time runs on `now` (milliseconds) while playing.
 */
export class ClipClock implements VideoLike {
  duration = Number.NaN;
  /** Clip time when the clock last started or was seeked. */
  private base = 0;
  /** `now()` at that moment, or null while paused. */
  private since: number | null = null;
  /** The part of the clip that loops, or null for all of it. */
  private range: [number, number] | null = null;

  constructor(private readonly now: () => number = () => performance.now()) {}

  get currentTime(): number {
    if (this.since === null) return this.base;
    const [start, end] = this.range ?? [0, this.duration];
    // Time before `start` (a seek there) plays forward into the range, then loops inside it.
    const t = this.base + (this.now() - this.since) / 1000;
    return t < end ? t : start + clipTime((t - start) * 1000, end - start);
  }

  set currentTime(t: number) {
    this.seek(t);
  }

  seek(t: number): void {
    this.base = t;
    if (this.since !== null) this.since = this.now();
  }

  setDuration(seconds: number): void {
    this.duration = seconds;
  }

  /** Loop only from `start` to `end` seconds. Null loops the whole clip. */
  setRange(range: [number, number] | null): void {
    const wasPlaying = this.since !== null;
    if (wasPlaying) this.pause();
    this.range = range;
    if (wasPlaying) void this.play();
  }

  get paused(): boolean {
    return this.since === null;
  }

  play(): Promise<void> {
    if (this.since === null) this.since = this.now();
    return Promise.resolve();
  }

  pause(): void {
    this.base = this.currentTime;
    this.since = null;
  }
}

/** Standing time kept either side of the reps when a demo loops only over them. */
const LOOP_PAD = 0.6;

/** The part of the clip with reps in it, plus a moment of standing either side. Null if it has no reps. */
export function repLoop(clip: PoseClip): [number, number] | null {
  const reps = findReps(clip);
  if (reps.length === 0) return null;
  return [Math.max(0, reps[0].start - LOOP_PAD), Math.min(clipDuration(clip), reps[reps.length - 1].end + LOOP_PAD)];
}

/**
 * Where the clock holds under reduced motion: the bottom of the last rep, so the reps
 * before it have been counted and scored. The start of the clip if it has no reps.
 */
export function holdTime(clip: PoseClip): number {
  const reps = findReps(clip);
  return reps.length ? reps[reps.length - 1].bottom : 0;
}

/**
 * A clock over `clip` that plays while `playing` (for example while on screen) and pauses otherwise.
 * It loops over `loop` (start and end seconds) when given, else over the whole clip.
 * Under reduced motion it never plays and holds still at `holdTime`.
 */
export function useClipClock(clip: PoseClip | null, playing: boolean, loop: [number, number] | null = null): VideoLike {
  const [clock] = useState(() => new ClipClock());
  const reduced = useReducedMotion();
  const [loopStart, loopEnd] = loop ?? [Number.NaN, Number.NaN];

  useEffect(() => {
    clock.setDuration(clip ? clipDuration(clip) : Number.NaN);
  }, [clock, clip]);

  useEffect(() => {
    clock.setRange(Number.isFinite(loopStart) && Number.isFinite(loopEnd) ? [loopStart, loopEnd] : null);
  }, [clock, loopStart, loopEnd]);

  useEffect(() => {
    if (!clip) return;
    if (reduced) {
      clock.pause();
      clock.seek(holdTime(clip));
    } else if (playing) {
      void clock.play();
    } else {
      clock.pause();
    }
  }, [clock, clip, playing, reduced]);

  return clock;
}
