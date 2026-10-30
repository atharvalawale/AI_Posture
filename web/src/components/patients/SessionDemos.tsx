"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { holdTime, repLoop, useClipClock } from "@/components/pose/clipClock";
import { PoseFigure, figureBounds, type FigureBounds } from "@/components/pose/PoseFigure";
import { usePoseClip } from "@/components/pose/usePoseClip";
import { useReducedMotion } from "@/components/showcase/useShowcase";
import { LiveSession, MEASURES, deepestPose, findReps, poseAt, repScore, standingPose, type Pose, type PoseClip } from "@/lib/pose";
import { DemoFeed } from "./demoFeed";

const TARGET = MEASURES.knee.target;
/** The demos open just after the first rep has counted, so every card shows something before anyone scrolls. */
const PRIME_AFTER_REP = 0.2;

/** True while `ref` is on screen. */
function useOnScreen(ref: RefObject<HTMLElement | null>) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return on;
}

type Figure = { aspect: number; bounds: FigureBounds; pose: Pose };

function Card({
  title,
  body,
  label,
  figure,
  readout,
  name,
}: {
  title: string;
  body: string;
  label: string;
  figure: Figure | null;
  readout: ReactNode;
  name: string;
}) {
  return (
    <li className="grid content-start gap-5 rounded-xl border border-line bg-surface p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-6 lg:grid-cols-1 lg:items-start lg:gap-5">
      {/* Tighter in the three narrow cards from 1024 px, so "Good rep. Stand tall" still takes two lines. */}
      <div role="img" aria-label={label} data-demo={name} className="grid h-56 grid-cols-[auto_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] items-center gap-6 rounded-lg bg-bg px-6 py-5 lg:gap-4 lg:px-5 xl:gap-6 xl:px-6">
        {/* Sized by height, so the figure fills the stage and the readout gets the rest. */}
        <div className="h-full" style={figure ? { aspectRatio: `${figure.bounds.w} / ${figure.bounds.h}` } : { width: 80 }} data-demo-figure>
          {figure && <PoseFigure pose={figure.pose} aspect={figure.aspect} bounds={figure.bounds} highlight={[25]} className="h-full w-full" />}
        </div>
        <div className="min-w-0">{readout}</div>
      </div>
      <div>
        <h4 className="text-[17px] font-semibold leading-snug">{title}</h4>
        <p className="mt-1.5 text-[16px] leading-relaxed text-pretty text-muted">{body}</p>
      </div>
    </li>
  );
}

/** One slot per rep in the clip: a faint stub that fills with the rep's score once it counts. */
function ScoreBars({ depths, slots }: { depths: number[]; slots: number }) {
  return (
    <div className="flex h-36 items-end gap-2" data-demo-scores>
      {Array.from({ length: slots }, (_, i) => {
        const depth = depths[i];
        const score = depth === undefined ? null : Math.round(repScore(depth, TARGET));
        return (
          <div key={i} className="flex h-full w-8 flex-col items-center" data-demo-score={score ?? undefined}>
            <span className={`text-[13px] font-semibold tabular-nums text-text ${score === null ? "invisible" : ""}`}>{score ?? 0}</span>
            <span className="relative mt-1 block w-full flex-1 overflow-hidden rounded-t-md bg-line/60">
              <span
                className="absolute inset-x-0 bottom-0 block bg-accent transition-[height] duration-500 ease-out"
                style={{ height: `${score ?? 0}%` }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function useDemoFigure(clip: PoseClip | null, t: number): Figure | null {
  const frame = useMemo(() => {
    if (!clip) return null;
    const aspect = clip.h / clip.w;
    return { aspect, bounds: figureBounds([standingPose(clip), deepestPose(clip).pose], aspect, 20) };
  }, [clip]);
  return frame && clip ? { ...frame, pose: poseAt(clip, t) } : null;
}

/**
 * Three live demos of what FiixBE does in every session, all fed by one session playing the tracked squat:
 * the spoken cue, the rep counter and a score per rep. The session is primed through the first rep so the
 * cards open alive, loops over the reps only, and counts on across loops. Plays only while on screen.
 */
export function SessionDemos() {
  const clip = usePoseClip();
  const rootRef = useRef<HTMLUListElement>(null);
  const onScreen = useOnScreen(rootRef);
  const reduced = useReducedMotion();
  const loop = useMemo(() => (clip ? repLoop(clip) : null), [clip]);
  const slots = useMemo(() => (clip ? findReps(clip).length : 0), [clip]);
  const clock = useClipClock(clip, onScreen, loop);
  const [session] = useState(() => new LiveSession());
  const feed = useMemo(() => new DemoFeed(session, slots), [session, slots]);
  const demo = useSyncExternalStore(feed.subscribe, feed.getSnapshot, feed.getSnapshot);

  useEffect(() => {
    if (clip) session.setClip(clip);
  }, [clip, session]);

  // Before anything plays: step the session through the first rep, or under reduced motion to the held frame.
  useEffect(() => {
    if (!clip) return;
    const detach = session.attach(clock);
    if (reduced) {
      feed.walk(0, holdTime(clip), clock);
    } else {
      const first = findReps(clip)[0];
      const prime = first ? first.end + PRIME_AFTER_REP : 0;
      feed.walk(loop ? loop[0] : 0, prime, clock);
      clock.currentTime = prime;
    }
    return detach;
  }, [clip, clock, session, feed, loop, reduced]);

  useEffect(() => {
    if (!clip || reduced || !onScreen) return;
    let raf = requestAnimationFrame(function tick() {
      feed.frame(clock.currentTime, clock);
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [clip, clock, feed, onScreen, reduced]);

  const figure = useDemoFigure(clip, demo.live.t);
  const ready = clip !== null;

  return (
    <ul ref={rootRef} className="grid gap-4 lg:grid-cols-3 lg:gap-5">
      <Card
        name="cue"
        title="Real-time form correction"
        body="Tells you out loud when to adjust, like a physio beside you."
        label="A figure squatting, with the cue FiixBE says out loud"
        figure={figure}
        readout={
          <p className="min-h-[2.6em] text-[19px] font-semibold leading-snug text-balance" data-demo-cue>
            {ready ? demo.cue : ""}
          </p>
        }
      />
      <Card
        name="reps"
        title="Automatic rep counting"
        body="Only full, controlled reps count."
        label="A figure squatting, with the count of full reps"
        figure={figure}
        readout={
          <div>
            <p className="font-serif text-[72px] leading-[0.9] tracking-[-0.03em] tabular-nums" data-demo-reps>
              {demo.reps}
            </p>
            <p className="mt-2 text-[15px] text-muted">{demo.reps === 1 ? "rep" : "reps"}</p>
          </div>
        }
      />
      <Card
        name="scores"
        title="A score for every rep"
        body="Each rep gets a score from 0 to 100, based on range of motion, hold time and smoothness."
        label="A figure squatting, with a score bar for each rep"
        figure={figure}
        readout={<ScoreBars depths={demo.depths} slots={slots} />}
      />
    </ul>
  );
}
