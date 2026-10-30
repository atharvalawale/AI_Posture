// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LiveSession, findReps, type PoseClip } from "@/lib/pose";
import fixture from "../../../public/media/squat.pose.json";
import { ClipClock, repLoop } from "../pose/clipClock";
import { DemoFeed } from "./demoFeed";

const clip = fixture as PoseClip;
const reps = findReps(clip);

function setup() {
  const session = new LiveSession(clip);
  const clock = new ClipClock(() => 0);
  session.attach(clock);
  return { feed: new DemoFeed(session, reps.length), clock };
}

describe("DemoFeed", () => {
  it("primed through the first rep, it opens on one counted and scored rep", () => {
    const { feed, clock } = setup();
    feed.walk(0, reps[0].end + 0.2, clock);
    const s = feed.getSnapshot();
    expect(s.reps).toBe(1);
    expect(s.depths).toHaveLength(1);
    expect(s.cue).toBe("Good rep. Stand tall");
  });

  it("counts on across a loop and keeps the last scores up", () => {
    const { feed, clock } = setup();
    const [start, end] = repLoop(clip)!;
    feed.walk(start, end, clock);
    expect(feed.getSnapshot().reps).toBe(reps.length);

    // The loop jumps back to the start: nothing empties.
    feed.frame(start, clock);
    let s = feed.getSnapshot();
    expect(s.reps).toBe(reps.length);
    expect(s.depths).toHaveLength(reps.length);
    expect(s.cue).toBe("Good rep. Stand tall");

    for (let t = start; t < reps[0].end + 0.2; t += 1 / 30) feed.frame(t, clock);
    s = feed.getSnapshot();
    expect(s.reps).toBe(reps.length + 1);
    expect(s.depths).toHaveLength(reps.length);
  });

  it("returns the same snapshot until something changes", () => {
    const { feed, clock } = setup();
    feed.walk(0, 1, clock);
    expect(feed.getSnapshot()).toBe(feed.getSnapshot());
  });
});
