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
  /** True while the visitor drives the clip: during a scrub, and for a moment after a scrub, a step or a joint pick. */
  driven: boolean;
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
  driven: false,
};

/**
 * The squat clip's poster is its first frame: Maya standing tall, her knee at 178°. A session that starts
 * on the poster shows that angle before the clip loads, and without JavaScript. live-session.test.ts pins it.
 */
export const POSTER_KNEE = 178;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/**
 * The single source of truth for the live squat: time, selected joint, reps, depth and form.
 * Framework free. Read it with `useSyncExternalStore(subscribe, getSnapshot)`.
 */
export class LiveSession {
  private clip: PoseClip | null;
  private state: LiveState = INITIAL;
  private readonly listeners = new Set<() => void>();
  private readonly counter = new RepCounter({ down: DOWN, target: 1000 });
  private video: VideoLike | null = null;
  private lastT: number | null = null;
  private minKnee = Infinity;
  private extremes: Record<JointId, number | null> = { knee: null, hip: null, back: null };
  private resume: ReturnType<typeof setTimeout> | null = null;
  private scrubStart = 0;
  private range: [number, number] | null = null;
  /** The last requested seek target, until the next frame arrives. */
  private pending: number | null = null;
  /** Ends `driven` a moment after the visitor's last scrub, step or joint pick. */
  private calm: ReturnType<typeof setTimeout> | null = null;
  /** Reduced motion: the clip never plays on its own, not even after a scrub or a step. */
  private still = false;

  /** `poster`: start on the squat clip's poster frame, so the knee reads its angle there before any frame plays. */
  constructor(clip: PoseClip | null = null, { poster = false }: { poster?: boolean } = {}) {
    this.clip = clip;
    if (poster) this.state = { ...INITIAL, value: POSTER_KNEE, knee: POSTER_KNEE };
  }

  /** Sets the clip and restarts the count. Setting the same clip again changes nothing. */
  setClip(clip: PoseClip): void {
    if (clip === this.clip) return;
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
    this.pending = null;

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
    // A scrub or a step holds the clip still. A video that takes over mid-way (the 3D phone
    // replacing the 2D one) holds still too, until the pending resume plays it.
    if (this.holding()) video.pause();
    return () => {
      if (this.video === video) this.video = null;
    };
  }

  /** A scrub or a step holds the clip still until it resumes on its own. */
  holding(): boolean {
    return this.state.scrubbing || this.resume !== null;
  }

  /** Under reduced motion the clip holds still: it plays only when the visitor picks a range or plays it all. */
  setStill(still: boolean): void {
    this.still = still;
    if (still) this.cancelResume();
  }

  /**
   * Holds the clip still at `t` (reduced motion): counts the reps from the start up to `t` as if the clip had
   * played, so the readout shows real values, then shows the frame at `t`, paused.
   */
  holdAt(t: number, fps = 30): void {
    const video = this.video;
    if (!this.clip || !video) return;
    this.cancelResume();
    video.pause();
    this.resetCounting();
    this.lastT = null;
    for (let s = 0; s < t; s += 1 / fps) this.frame(s, video);
    this.frame(t, video);
    this.seek(t);
  }

  setJoint(joint: JointId): void {
    if (joint === this.state.joint) return;
    this.set({
      ...this.state,
      joint,
      value: this.valueAt(this.state.t, joint),
      extreme: this.roundedExtreme(joint),
      driven: true,
    });
    this.scheduleCalm();
  }

  cycleJoint(): void {
    this.setJoint(JOINT_IDS[(JOINT_IDS.indexOf(this.state.joint) + 1) % JOINT_IDS.length]);
  }

  beginScrub(): void {
    this.cancelResume();
    this.video?.pause();
    this.scrubStart = this.state.t;
    this.cancelCalm();
    this.set({ ...this.state, scrubbing: true, driven: true });
  }

  scrubTo(dxPx: number, widthPx: number): void {
    if (!this.video || widthPx <= 0) return;
    this.seek(this.scrubStart + (dxPx / widthPx) * SCRUB_PER_WIDTH);
  }

  endScrub(): void {
    this.set({ ...this.state, scrubbing: false });
    this.scheduleResume();
    this.scheduleCalm();
  }

  step(dir: -1 | 1): void {
    if (!this.video) return;
    this.cancelResume();
    this.video.pause();
    this.seek((this.pending ?? this.state.t) + dir * STEP_SECONDS);
    this.scheduleResume();
    this.set({ ...this.state, driven: true });
    this.scheduleCalm();
  }

  /**
   * Loops the clip between two times, or plays it all again with null. Picking a range is a user gesture,
   * so this also plays: a video whose autoplay was blocked starts here instead of showing a still frame.
   */
  loop(range: [number, number] | null): void {
    this.range = range;
    if (!this.video) return;
    if (range) this.video.currentTime = range[0];
    this.video.play().catch(() => {
      // Still blocked: the frame at the start of the range shows instead.
    });
  }

  dispose(): void {
    this.cancelResume();
    this.cancelCalm();
    this.listeners.clear();
    this.video = null;
  }

  private seek(t: number): void {
    if (!this.video) return;
    // duration is NaN before metadata loads and Infinity for some streams: no upper bound then.
    const d = this.video.duration;
    const max = Number.isFinite(d) ? Math.max(0, d - END_GUARD) : Infinity;
    const target = clamp(t, 0, max);
    this.pending = target;
    this.video.currentTime = target;
  }

  private scheduleResume(): void {
    this.cancelResume();
    if (this.still) return;
    this.resume = setTimeout(() => {
      this.resume = null;
      this.video?.play().catch(() => {});
    }, RESUME_MS);
  }

  private cancelResume(): void {
    if (this.resume !== null) clearTimeout(this.resume);
    this.resume = null;
  }

  private scheduleCalm(): void {
    this.cancelCalm();
    this.calm = setTimeout(() => {
      this.calm = null;
      if (!this.state.scrubbing) this.set({ ...this.state, driven: false });
    }, RESUME_MS);
  }

  private cancelCalm(): void {
    if (this.calm !== null) clearTimeout(this.calm);
    this.calm = null;
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
      a.depths === next.depths && a.form === next.form && a.scrubbing === next.scrubbing && a.driven === next.driven
    ) return;
    this.state = next;
    for (const fn of [...this.listeners]) fn();
  }
}
