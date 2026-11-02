"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { MAYA, MAYA_SESSION } from "@/lib/sample";
import type { StoryProgress } from "../ScreenStack";

const { depths: DEPTHS, target: TARGET, deepest: DEEPEST, formScore: SCORE, change: CHANGE, setLabel: SET_LABEL } = MAYA_SESSION;
// Knee angles at the bottom and the top of the bar track, as on the physio's rep bars, so a few degrees show.
const RANGE: [number, number] = [70, 140];
const heightOf = (angle: number) => Math.min(1, Math.max(0, (RANGE[1] - angle) / (RANGE[1] - RANGE[0])));

const STATS: [string, string][] = [
  ["Reps", "30 of 30"],
  ["Deepest knee bend", `${DEEPEST}°`],
  ["Pain after session", MAYA.pain],
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Session summary of Maya's squats this morning: form score, the knee bend of set 1's first 3 reps against the target,
 * and the report sent to the physio. Every number comes from MAYA_SESSION, which is pinned to the clip.
 * With `story`, the score counts up and the bars fill as the story scrolls through the summary
 * chapter (progress 0.34 to 0.5), written straight to the DOM. Without it, or with reduced
 * motion, the full state shows.
 */
export function SummaryScreen({ active = true, story }: { active?: boolean; story?: StoryProgress }) {
  const score = useRef<HTMLParagraphElement>(null);
  const bars = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (!story) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    // The fill finishes at 0.5, where the chapter rail lands, and holds until the plan takes over at 0.66.
    // With reduced motion the full state shows. The score is written over React's text node on purpose.
    const apply = () => {
      const k = reduced?.matches ? 1 : clamp01((story.progress.current - 0.34) / 0.16);
      if (score.current) score.current.textContent = String(Math.round(k * SCORE));
      bars.current.forEach((el, i) => {
        if (el) el.style.transform = `scaleY(${k > i / DEPTHS.length ? 1 : 0})`;
      });
    };
    apply();
    reduced?.addEventListener("change", apply);
    const off = story.onProgress(apply);
    return () => {
      reduced?.removeEventListener("change", apply);
      off();
    };
  }, [story]);

  const scrolled = !!story;
  return (
    <div className="flex h-full flex-col bg-bg px-5 pb-5 pt-[58px] text-text">
      <p className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em]">Session complete</p>
      <p className="mt-1.5 text-sm text-muted">Squats, 3 sets, 14 minutes</p>

      <div className="mb-[18px] mt-[22px] flex items-center gap-4 rounded-[18px] border border-line bg-surface p-4">
        <p ref={score} className="text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{SCORE}</p>
        <p className="text-[13px] leading-[1.4] text-muted">
          Form score
          <br />
          Up {CHANGE} from yesterday
        </p>
      </div>

      {/* The first 3 reps of set 1: deeper bends stand taller, and a bar that reaches the dashed target line is filled. */}
      <div className="relative h-[90px]" aria-hidden="true">
        <span
          className="absolute inset-x-0 border-t border-dashed border-muted"
          style={{ bottom: `${heightOf(TARGET) * 100}%` }}
        />
        <div className="relative flex h-full items-end justify-around gap-4 px-4">
          {DEPTHS.map((depth, i) => (
            <i
              key={i}
              ref={(el) => {
                bars.current[i] = el;
              }}
              className={`block w-12 origin-bottom rounded-t-[4px] transition-transform duration-300 ease-out motion-reduce:transition-none ${
                depth <= TARGET ? "bg-accent" : "bg-muted/35"
              }`}
              style={{
                height: `${heightOf(depth) * 100}%`,
                // With a story, the effect above owns the transform and the bars fill as you scroll.
                ...(scrolled ? {} : { transform: `scaleY(${active ? 1 : 0})`, transitionDelay: active ? `${120 + i * 90}ms` : "0ms" }),
              }}
            />
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-around gap-4 px-4 text-[13px] tabular-nums" aria-hidden="true">
        {DEPTHS.map((depth, i) => (
          <span key={i} className={`w-12 text-center ${depth <= TARGET ? "text-text" : "text-muted"}`}>
            {depth}°
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[13px] text-muted">
        <span>{SET_LABEL}</span>
        <span>Target {TARGET}°</span>
      </div>
      <p className="sr-only">
        {SET_LABEL}, deepest knee bend per rep: {DEPTHS.map((d) => `${d}°`).join(", ")}. Target {TARGET}°.
      </p>

      <dl className="mt-3.5 text-sm">
        {STATS.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-line py-2.5">
            <dt className="text-muted">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto flex items-center gap-2.5 rounded-[14px] border border-line bg-surface px-3.5 py-3 text-[13px]">
        <Image src="/images/avatars/physio.webp" alt="" width={32} height={32} unoptimized className="h-8 w-8 rounded-full object-cover" />
        Sent to your physio
      </div>
    </div>
  );
}
