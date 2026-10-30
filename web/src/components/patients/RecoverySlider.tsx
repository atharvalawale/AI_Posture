"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { PoseFigure, figureBounds } from "@/components/pose/PoseFigure";
import { usePoseClip } from "@/components/pose/usePoseClip";
import { useReducedMotion } from "@/components/showcase/useShowcase";
import {
  WEEKS,
  blendForKnee,
  blendPose,
  deepestPose,
  standingPose,
  weekBlend,
  weekDepths,
  weekPose,
  type PoseClip,
} from "@/lib/pose";
import { WeekChart } from "./WeekChart";

/** The physio's knee bend target, drawn as the ghost and the chart's dashed line. */
const TARGET = 100;
const KNEE = 25;
const TWEEN_MS = 320;

/** Everything the slider draws that depends only on the clip. */
function useFigure(clip: PoseClip | null) {
  return useMemo(() => {
    if (!clip) return null;
    const aspect = clip.h / clip.w;
    const standing = standingPose(clip);
    const deepest = deepestPose(clip).pose;
    const ghost = blendPose(standing, deepest, blendForKnee(clip, TARGET));
    // Every week's pose is a blend between week 1 and week 6, so those two (and the ghost) bound them all.
    const bounds = figureBounds([weekPose(clip, 1), weekPose(clip, WEEKS), ghost], aspect);
    return { aspect, standing, deepest, ghost, bounds, depths: weekDepths(clip) };
  }, [clip]);
}

/** The blend toward the deepest pose, eased to its new value when the week changes. Jumps under reduced motion. */
function useEasedBlend(target: number, reduced: boolean) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduced || typeof window.requestAnimationFrame !== "function") {
      from.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    const k0 = from.current;
    let raf = window.requestAnimationFrame(function tick(now) {
      const p = Math.min(1, (now - start) / TWEEN_MS);
      const k = k0 + (target - k0) * (1 - (1 - p) ** 3);
      from.current = k;
      setShown(k);
      if (p < 1) raf = window.requestAnimationFrame(tick);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [target, reduced]);
  return shown;
}

/**
 * The For patients hero: a skeleton squatting deeper week by week, from about 140° at the knee in week 1
 * to the full depth of the real clip in week 6, with the physio's 100° target as a ghost.
 * Every pose and angle is computed from the tracked squat, none is typed in.
 */
export function RecoverySlider() {
  const clip = usePoseClip();
  const figure = useFigure(clip);
  const reduced = useReducedMotion();
  const [week, setWeek] = useState(1);
  const blend = useEasedBlend(weekBlend(week), reduced);
  const sliderId = useId();

  const depth = figure ? Math.round(figure.depths[week - 1]) : null;
  const pose = figure ? blendPose(figure.standing, figure.deepest, blend) : null;

  return (
    <div className="grid items-center gap-x-10 gap-y-8 sm:grid-cols-2 lg:gap-x-8">
      <figure className="m-0">
        <div
          role="img"
          aria-label={`A figure at the bottom of a squat in week ${week}, beside a dashed outline of the ${TARGET}° target`}
          className="mx-auto aspect-[5/6] w-full max-w-[340px] sm:max-w-none"
        >
          {figure && pose ? (
            <PoseFigure
              pose={pose}
              aspect={figure.aspect}
              bounds={figure.bounds}
              ghost={figure.ghost}
              highlight={[KNEE]}
              arcAt={KNEE}
              className="h-full w-full"
            />
          ) : null}
        </div>
        <figcaption className="mt-4 flex items-center justify-center gap-2 text-[13px] text-muted">
          <svg viewBox="0 0 24 4" className="h-1 w-6 shrink-0 overflow-visible" aria-hidden="true">
            <line x1="1" y1="2" x2="23" y2="2" className="stroke-muted" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
          </svg>
          Your physio&apos;s target, {TARGET}°
        </figcaption>
      </figure>

      <div className="min-w-0">
        <p className="text-[15px] text-muted">Deepest knee bend, week {week}</p>
        <p className="mt-1 font-serif text-[96px] leading-[0.9] tracking-[-0.03em] tabular-nums sm:text-[112px] lg:text-[120px]">
          <span data-recovery-angle className={depth === null ? "text-line" : undefined}>
            {depth === null ? "--" : depth}
          </span>
          <span className={`ml-1 align-top font-sans text-[0.32em] text-muted ${depth === null ? "invisible" : ""}`} style={{ position: "relative", top: "0.2em" }}>
            °
          </span>
        </p>

        <div className="mt-6">
          <input
            id={sliderId}
            type="range"
            min={1}
            max={WEEKS}
            step={1}
            value={week}
            aria-label="Recovery week"
            aria-valuetext={depth === null ? `Week ${week}` : `Week ${week}, deepest knee bend ${depth}°`}
            onChange={(e) => setWeek(Number(e.target.value))}
            className="block h-11 w-full cursor-pointer accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <div aria-hidden="true" className="flex justify-between text-[13px] text-muted">
            <span>Week 1</span>
            <span>Week {WEEKS}</span>
          </div>
        </div>

        <div className="mt-8 border-t border-line pt-5">
          <p className="text-[15px] text-muted">Deepest bend per week</p>
          <div className="mt-3">
            {figure ? (
              <WeekChart depths={figure.depths} week={week} onWeek={setWeek} target={TARGET} />
            ) : (
              <div className="h-[172px]" />
            )}
          </div>
        </div>
      </div>

      <p className="text-[13px] leading-relaxed text-pretty text-muted sm:col-span-2">
        An illustration built from real pose tracking of one squat. Your own numbers depend on your recovery.
      </p>
    </div>
  );
}
