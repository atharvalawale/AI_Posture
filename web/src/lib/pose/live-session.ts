import type { PoseClip } from "./clip";
import { JOINT_IDS, MEASURES, measure, type JointId } from "./measures";
import { RepCounter, type Cue } from "./reps";
import { formScore } from "./score";

export type LiveState = {
  t: number;
  joint: JointId;
  /** The selected joint's measure, rounded. */
  value: number | null;
  /** Knee angle, rounded. */
  knee: number | null;
  reps: number;
  cue: Cue;
  /** Deepest (min) or most lean (max) of the selected joint since the last reset, rounded. */
  extreme: number | null;
  /** Deepest knee angle per completed rep, not rounded. */
  depths: number[];
  form: number | null;
  scrubbing: boolean;
};

export type VideoLike = {
  currentTime: number;
  readonly duration: number;
  readonly paused: boolean;
  play(): Promise<void>;
  pause(): void;
};

/** Seconds per full phone width, from the hero mockup. */
export const SCRUB_PER_WIDTH = 8;
export const STEP_SECONDS = 0.25;
export const RESUME_MS = 900;

/** A frame this much earlier than the last one is a backward jump and restarts the counting. */
const BACKWARD = 0.05;
const DOWN = 115;
const END_GUARD = 0.05;

const INITIAL: LiveState = {
  t: 0,
  joint: "knee",
  value: null,
  knee: null,
  reps: 0,
  cue: "Stand tall to begin",
  extreme: null,
  depths: [],
  form: null,
  scrubbing: false,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/**
 * The single source of truth for the live squat: time, selected joint, reps, depth and form.
 * Framework free. Read it with `useSyncExternalStore(subscribe, getSnapshot)`.
 */
export class LiveSession {
  private clip: PoseClip | null;
  private state: LiveState = INITIAL;
  private readonly listeners = new Set<() => void>();
  private readonly counter = new RepCounter({ target: 1000 });
  private video: VideoLike | null = null;
  private lastT: number | null = null;
  private minKnee = Infinity;
  private extremes: Record<JointId, number | null> = { knee: null, hip: null, back: null };
  private resume: ReturnType<typeof setTimeout> | null = null;
  private scrubStart = 0;
  private range: [number, number] | null = null;

  constructor(clip: PoseClip | null = null) {
    this.clip = clip;
  }

  setClip(clip: PoseClip): void {
    this.clip = clip;
    this.resetCounting();
    this.lastT = null;
    this.set({ ...this.state, ...this.blank() });
  }

  getSnapshot = (): LiveState => this.state;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  frame(t: number, source: VideoLike): void {
    if (!this.clip || source !== this.video) return;
    if (this.lastT !== null && t < this.lastT - BACKWARD) this.resetCounting();
    this.lastT = t;

    const knee = measure(this.clip, t, "knee");
    for (const j of JOINT_IDS) {
      const v = j === "knee" ? knee : measure(this.clip, t, j);
      const cur = this.extremes[j];
      this.extremes[j] = cur === null ? v : MEASURES[j].extreme === "min" ? Math.min(cur, v) : Math.max(cur, v);
    }
    if (knee < DOWN) this.minKnee = Math.min(this.minKnee, knee);

    const { reps, cue } = this.counter.update(knee);
    let depths = this.state.depths;
    if (reps > depths.length) {
      depths = [...depths, this.minKnee];
      this.minKnee = Infinity;
    }

    this.set({
      ...this.state,
      t,
      value: this.valueAt(t, this.state.joint),
      knee: Math.round(knee),
      reps,
      cue,
      extreme: this.roundedExtreme(this.state.joint),
      depths,
      form: depths === this.state.depths ? this.state.form : formScore(depths, MEASURES.knee.target),
    });

    if (this.range && t > this.range[1]) source.currentTime = this.range[0];
  }

  attach(video: VideoLike): () => void {
    this.video = video;
    if (this.state.t > 0) video.currentTime = this.state.t;
    return () => {
      if (this.video === video) this.video = null;
    };
  }

  setJoint(joint: JointId): void {
    if (joint === this.state.joint) return;
    this.set({
      ...this.state,
      joint,
      value: this.valueAt(this.state.t, joint),
      extreme: this.roundedExtreme(joint),
    });
  }

  cycleJoint(): void {
    this.setJoint(JOINT_IDS[(JOINT_IDS.indexOf(this.state.joint) + 1) % JOINT_IDS.length]);
  }

  beginScrub(): void {
    this.cancelResume();
    this.video?.pause();
    this.scrubStart = this.state.t;
    this.set({ ...this.state, scrubbing: true });
  }

  scrubTo(dxPx: number, widthPx: number): void {
    if (!this.video || widthPx <= 0) return;
    this.seek(this.scrubStart + (dxPx / widthPx) * SCRUB_PER_WIDTH);
  }

  endScrub(): void {
    this.set({ ...this.state, scrubbing: false });
    this.scheduleResume();
  }

  step(dir: -1 | 1): void {
    if (!this.video) return;
    this.cancelResume();
    this.video.pause();
    this.seek(this.state.t + dir * STEP_SECONDS);
    this.scheduleResume();
  }

  loop(range: [number, number] | null): void {
    this.range = range;
    if (range && this.video) this.video.currentTime = range[0];
  }

  dispose(): void {
    this.cancelResume();
    this.listeners.clear();
    this.video = null;
  }

  private seek(t: number): void {
    if (!this.video) return;
    this.video.currentTime = clamp(t, 0, Math.max(0, this.video.duration - END_GUARD));
  }

  private scheduleResume(): void {
    this.cancelResume();
    this.resume = setTimeout(() => {
      this.resume = null;
      this.video?.play().catch(() => {});
    }, RESUME_MS);
  }

  private cancelResume(): void {
    if (this.resume !== null) clearTimeout(this.resume);
    this.resume = null;
  }

  private valueAt(t: number, joint: JointId): number | null {
    return this.clip ? Math.round(measure(this.clip, t, joint)) : null;
  }

  private roundedExtreme(joint: JointId): number | null {
    const e = this.extremes[joint];
    return e === null ? null : Math.round(e);
  }

  private resetCounting(): void {
    this.counter.reset();
    this.minKnee = Infinity;
    this.extremes = { knee: null, hip: null, back: null };
    this.state = { ...this.state, ...this.blank(), t: this.state.t };
  }

  private blank(): Pick<LiveState, "reps" | "cue" | "extreme" | "depths" | "form"> {
    return { reps: 0, cue: INITIAL.cue, extreme: null, depths: [], form: null };
  }

  /** Swap in a new state object and notify, but only when something actually differs. */
  private set(next: LiveState): void {
    const a = this.state;
    if (
      a.t === next.t && a.joint === next.joint && a.value === next.value && a.knee === next.knee &&
      a.reps === next.reps && a.cue === next.cue && a.extreme === next.extreme &&
      a.depths === next.depths && a.form === next.form && a.scrubbing === next.scrubbing
    ) return;
    this.state = next;
    for (const fn of [...this.listeners]) fn();
  }
}
