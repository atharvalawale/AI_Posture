"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { StoryProgress } from "../ScreenStack";

// Knee depth per rep, as a share of the target depth. Sample data for the app preview.
const DEPTH = [62, 70, 74, 68, 80, 84, 79, 88, 92, 90];

const STATS: [string, string][] = [
  ["Reps", "30 of 30"],
  ["Deepest knee bend", "95°"],
  ["Pain after session", "2 of 10"],
];

const SCORE = 92;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Session summary: form score, depth per rep, and the report sent to the physio.
 * With `story`, the score counts up and the bars fill as the story scrolls through the summary
 * chapter (progress 0.33 to 0.66), written straight to the DOM. Without it, or with reduced
 * motion, the full state shows.
 */
export function SummaryScreen({ active = true, story }: { active?: boolean; story?: StoryProgress }) {
  const score = useRef<HTMLParagraphElement>(null);
  const bars = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (!story || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const apply = () => {
      const k = clamp01((story.progress.current - 0.33) / 0.33);
      if (score.current) score.current.textContent = String(Math.round(k * SCORE));
      bars.current.forEach((el, i) => {
        if (el) el.style.transform = `scaleY(${k > i / DEPTH.length ? 1 : 0})`;
      });
    };
    apply();
    return story.onProgress(apply);
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
          Up 6 from Monday
        </p>
      </div>

      <div className="flex h-[90px] items-end gap-[5px] px-0.5" aria-hidden="true">
        {DEPTH.map((h, i) => (
          <i
            key={i}
            ref={(el) => {
              bars.current[i] = el;
            }}
            className="block flex-1 origin-bottom rounded-b-[2px] rounded-t-[4px] bg-accent transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{
              height: `${h}%`,
              // With a story, the effect above owns the transform and the bars fill as you scroll.
              ...(scrolled ? {} : { transform: `scaleY(${active ? 1 : 0})`, transitionDelay: active ? `${120 + i * 45}ms` : "0ms" }),
            }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span>Rep 1</span>
        <span>Depth per rep</span>
        <span>Rep 10</span>
      </div>

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
