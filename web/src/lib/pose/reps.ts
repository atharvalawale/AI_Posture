export type Cue = "Stand tall to begin" | "Lower slowly" | "Good depth, hold" | "Push up through your heels" | "Good rep. Stand tall";

/** Smallest change in degrees that counts as moving. Smaller changes keep the last direction. */
const MOVE = 0.2;

/**
 * Counts squat reps from the knee angle and picks the spoken cue.
 * A rep counts when the angle drops below `down` and then rises above `up`.
 * After `target` reps the count starts again at 1.
 */
export class RepCounter {
  private readonly down: number;
  private readonly up: number;
  private readonly target: number;
  private reps = 0;
  private bent = false;
  private last: number | null = null;
  private lowering = false;

  constructor(opts: { down?: number; up?: number; target?: number } = {}) {
    this.down = opts.down ?? 115;
    this.up = opts.up ?? 160;
    this.target = opts.target ?? 10;
  }

  update(angle: number): { reps: number; cue: Cue } {
    if (angle < this.down && !this.bent) this.bent = true;
    if (angle > this.up && this.bent) {
      this.bent = false;
      this.reps = this.reps >= this.target ? 1 : this.reps + 1;
    }
    if (this.last !== null) {
      if (angle < this.last - MOVE) this.lowering = true;
      else if (angle > this.last + MOVE) this.lowering = false;
    }
    this.last = angle;

    let cue: Cue;
    if (angle > this.up + 5) cue = this.reps ? "Good rep. Stand tall" : "Stand tall to begin";
    else if (angle < this.down - 3) cue = "Good depth, hold";
    else cue = this.lowering ? "Lower slowly" : "Push up through your heels";
    return { reps: this.reps, cue };
  }

  reset(): void {
    this.reps = 0;
    this.bent = false;
    this.last = null;
    this.lowering = false;
  }
}
