"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { PhoneFrame } from "@/components/phone/PhoneFrame";
import { PlanScreen } from "@/components/phone/screens/PlanScreen";
import { PoseFigure, figureBounds } from "@/components/pose/PoseFigure";
import { usePoseClip } from "@/components/pose/usePoseClip";
import { useShowcasePanelActive } from "@/components/showcase/Showcase";
import { WEEKS, standingPose, weekDepths } from "@/lib/pose";
import { WeekChart } from "./WeekChart";

const panel = "flex h-full rounded-xl border border-line bg-surface p-5 sm:p-6";
const PHONE = 220;

/** Step 1: the plan the physio wrote, arriving on the patient's phone. */
export function PlanPanel() {
  const active = useShowcasePanelActive();
  return (
    <div className={`${panel} items-center justify-center`}>
      <div role="img" aria-label="The FiixBE app showing today's plan from your physio: squats, a hamstring stretch and split squats.">
        <PhoneFrame width={PHONE}>
          <PlanScreen active={active} />
        </PhoneFrame>
      </div>
    </div>
  );
}

/** Step 2: the phone propped up, with a dashed outline of a standing body to step into. */
export function GuidePanel() {
  const clip = usePoseClip();
  const guide = useMemo(() => {
    if (!clip) return null;
    const aspect = clip.h / clip.w;
    const pose = standingPose(clip);
    return { aspect, pose, bounds: figureBounds([pose], aspect, 60) };
  }, [clip]);

  return (
    <div className={`${panel} items-center justify-center`}>
      <div role="img" aria-label="The FiixBE app before a session, showing a dashed outline of a body to stand inside.">
        <PhoneFrame width={PHONE}>
          <div className="flex h-full flex-col bg-bg px-5 pb-6 pt-[52px] text-text">
            <p className="text-[13px] text-muted">Squats</p>
            <p className="mt-1 text-[24px] font-semibold leading-[1.1] tracking-[-0.02em]">Get into position</p>
            <div className="mt-5 min-h-0 flex-1 rounded-2xl bg-surface-2 p-4">
              {guide && (
                // The guide is the only thing on this screen, so it drops the ghost's usual fade.
                <PoseFigure pose={null} ghost={guide.pose} aspect={guide.aspect} bounds={guide.bounds} className="h-full w-full [&_[data-figure-ghost]]:opacity-100" />
              )}
            </div>
            <p className="mt-5 text-[17px] font-semibold leading-snug text-pretty">Step back until your whole body is inside the guide</p>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

/** Step 3: the deepest knee bend per week, from the same tracked squat as the hero. Sample data. */
export function ProgressPanel() {
  const clip = usePoseClip();
  const depths = useMemo(() => (clip ? weekDepths(clip) : null), [clip]);
  const [week, setWeek] = useState(WEEKS);
  const depth = depths ? Math.round(depths[week - 1]) : null;

  return (
    <div className={`${panel} flex-col`}>
      <div className="flex items-center gap-3">
        <Image src="/images/avatars/maya.webp" alt="" width={44} height={44} unoptimized className="size-11 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="text-[17px] font-semibold leading-snug text-text">Maya&apos;s progress</p>
          <p className="text-[15px] text-muted">Knee recovery plan, week {WEEKS}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-1 flex-col border-t border-line pt-5">
        <p className="text-[15px] text-muted">Deepest knee bend, week {week}</p>
        <p className="mt-1 font-serif text-[56px] leading-none tracking-[-0.02em] tabular-nums">
          <span className={depth === null ? "text-line" : undefined}>{depth === null ? "--" : depth}</span>
          <span className={`ml-0.5 align-top font-sans text-[0.4em] text-muted ${depth === null ? "invisible" : ""}`}>°</span>
        </p>
        <div className="mt-auto pt-6">
          {depths ? <WeekChart depths={depths} week={week} onWeek={setWeek} target={100} /> : <div className="h-[172px]" />}
        </div>
      </div>

      <p className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-[15px] text-muted">
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 12.5l4 4 8-9" />
        </svg>
        Shared with your physio
      </p>
    </div>
  );
}
