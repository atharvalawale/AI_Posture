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

  constructor(private readonly now: () => number = () => performance.now()) {}

  get currentTime(): number {
    if (this.since === null) return this.base;
    return clipTime(this.base * 1000 + this.now() - this.since, this.duration);
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
 * Under reduced motion it never plays and holds still at `holdTime`.
 */
export function useClipClock(clip: PoseClip | null, playing: boolean): VideoLike {
  const [clock] = useState(() => new ClipClock());
  const reduced = useReducedMotion();

  useEffect(() => {
    clock.setDuration(clip ? clipDuration(clip) : Number.NaN);
  }, [clock, clip]);

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
