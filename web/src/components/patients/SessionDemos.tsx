"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { holdTime, useClipClock } from "@/components/pose/clipClock";
import { PoseFigure, figureBounds, type FigureBounds } from "@/components/pose/PoseFigure";
import { usePoseClip } from "@/components/pose/usePoseClip";
import { useReducedMotion } from "@/components/showcase/useShowcase";
import { LiveSession, MEASURES, deepestPose, poseAt, repScore, standingPose, type LiveState, type Pose, type PoseClip } from "@/lib/pose";

const TARGET = MEASURES.knee.target;
/** Frames per second when walking the clip up to the held frame under reduced motion. */
const WALK_FPS = 30;

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
      <div role="img" aria-label={label} data-demo={name} className="flex h-56 items-center gap-5 rounded-lg bg-bg px-5 py-4">
        <div className="h-full w-20 shrink-0" data-demo-figure>
          {figure && <PoseFigure pose={figure.pose} aspect={figure.aspect} bounds={figure.bounds} highlight={[25]} className="h-full w-full" />}
        </div>
        <div className="min-w-0 flex-1">{readout}</div>
      </div>
      <div>
        <h4 className="text-[17px] font-semibold leading-snug">{title}</h4>
        <p className="mt-1.5 text-[16px] leading-relaxed text-pretty text-muted">{body}</p>
      </div>
    </li>
  );
}

function ScoreBars({ depths }: { depths: number[] }) {
  if (depths.length === 0) return <p className="text-[15px] text-balance text-muted">Scores appear after each rep</p>;
  return (
    <div className="flex h-36 items-end gap-2" data-demo-scores>
      {depths.map((d, i) => {
        const score = Math.round(repScore(d, TARGET));
        return (
          <div key={i} className="flex h-full w-8 flex-col items-center justify-end">
            <span className="text-[13px] font-semibold tabular-nums text-text">{score}</span>
            <span className="mt-1 block w-full rounded-t-md bg-accent" style={{ height: `${Math.max(4, score) * 0.8}%` }} />
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
    return { aspect, bounds: figureBounds([standingPose(clip), deepestPose(clip).pose], aspect) };
  }, [clip]);
  return frame && clip ? { ...frame, pose: poseAt(clip, t) } : null;
}

/**
 * Three live demos of what FiixBE does in every session, all fed by one session playing the tracked squat:
 * the spoken cue, the rep counter and a score per rep. Plays only while on screen.
 */
export function SessionDemos() {
  const clip = usePoseClip();
  const rootRef = useRef<HTMLUListElement>(null);
  const onScreen = useOnScreen(rootRef);
  const reduced = useReducedMotion();
  const clock = useClipClock(clip, onScreen);
  const [session] = useState(() => new LiveSession());
  const state: LiveState = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);

  useEffect(() => {
    if (clip) session.setClip(clip);
  }, [clip, session]);

  useEffect(() => {
    if (!clip) return;
    const detach = session.attach(clock);
    if (reduced) {
      // No motion: walk the clip up to the held frame at once, so its reps are counted and scored.
      const hold = holdTime(clip);
      for (let t = 0; t < hold; t += 1 / WALK_FPS) session.frame(t, clock);
      session.frame(hold, clock);
      return detach;
    }
    if (!onScreen) return detach;
    let raf = requestAnimationFrame(function tick() {
      session.frame(clock.currentTime, clock);
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(raf);
      detach();
    };
  }, [clip, clock, session, onScreen, reduced]);

  const figure = useDemoFigure(clip, state.t);
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
            {ready ? state.cue : ""}
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
              {state.reps}
            </p>
            <p className="mt-2 text-[15px] text-muted">{state.reps === 1 ? "rep" : "reps"}</p>
          </div>
        }
      />
      <Card
        name="scores"
        title="A score for every rep"
        body="Each rep gets a score from 0 to 100, based on range of motion, hold time and smoothness."
        label="A figure squatting, with a score bar for each rep"
        figure={figure}
        readout={<ScoreBars depths={state.depths} />}
      />
    </ul>
  );
}
