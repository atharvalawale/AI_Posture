import type { Cue, LiveSession, LiveState, VideoLike } from "@/lib/pose";

/** What the demo cards show: the session's state, with reps and scores counted on across loops of the clip. */
export type DemoState = { live: LiveState; reps: number; depths: number[]; cue: Cue };

/** A jump back by more than this is the clip looping. LiveSession treats it the same way. */
const BACKWARD = 0.05;

/**
 * Feeds a looping clip into a LiveSession for the demos. When the clip loops, the session starts counting
 * again from zero; the feed carries the reps and scores so far, so the counter counts on and the last
 * `slots` scores stay up instead of the cards emptying every loop.
 * Read it with `useSyncExternalStore(feed.subscribe, feed.getSnapshot)`.
 */
export class DemoFeed {
  private carriedReps = 0;
  private carriedDepths: number[] = [];
  private lastT: number | null = null;
  private base: LiveState | null = null;
  private version = 0;
  private seen = -1;
  private snap: DemoState | null = null;

  constructor(
    private readonly session: LiveSession,
    private readonly slots: number,
  ) {}

  subscribe = (fn: () => void) => this.session.subscribe(fn);

  getSnapshot = (): DemoState => {
    const live = this.session.getSnapshot();
    if (this.snap && live === this.base && this.seen === this.version) return this.snap;
    this.base = live;
    this.seen = this.version;
    const looped = this.carriedReps > 0 && live.reps === 0;
    this.snap = {
      live,
      reps: this.carriedReps + live.reps,
      depths: [...this.carriedDepths, ...live.depths].slice(-this.slots),
      // Standing again at the top of a loop follows a good rep, so say so rather than "Stand tall to begin".
      cue: looped && live.cue === "Stand tall to begin" ? "Good rep. Stand tall" : live.cue,
    };
    return this.snap;
  };

  /** Feed the frame at clip time `t`. A jump back is a loop: the counts so far carry over. */
  frame(t: number, source: VideoLike): void {
    if (this.lastT !== null && t < this.lastT - BACKWARD) {
      const live = this.session.getSnapshot();
      this.carriedReps += live.reps;
      this.carriedDepths = [...this.carriedDepths, ...live.depths].slice(-this.slots);
      this.version++;
    }
    this.lastT = t;
    this.session.frame(t, source);
  }

  /** Forget the carried counts, for example before walking the clip from the start again. */
  reset(): void {
    this.carriedReps = 0;
    this.carriedDepths = [];
    this.lastT = null;
    this.version++;
  }

  /** Feed every frame from `from` to `to` at `fps`, at once, starting a fresh count. */
  walk(from: number, to: number, source: VideoLike, fps = 30): void {
    this.reset();
    for (let t = from; t < to; t += 1 / fps) this.frame(t, source);
    this.frame(to, source);
  }
}
