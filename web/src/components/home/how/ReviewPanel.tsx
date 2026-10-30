"use client";

import Image from "next/image";
import { useState } from "react";
import { useClipReps } from "@/components/pose/usePoseClip";
import { RepBars } from "@/components/product/RepBars";
import { reachedCount } from "@/lib/pose";
import { MAYA_SESSION } from "@/lib/sample";

export const TARGET = MAYA_SESSION.target;
// Standing is about 170° and the clip's deepest rep about 95°. This range keeps every bar well clear of both ends, so a few degrees show.
export const RANGE: [number, number] = [70, 140];

/** One rep against the target, in the words the physio reads. */
function repLine(depth: number, i: number) {
  const deg = Math.round(depth);
  return reachedCount([depth], TARGET) === 1
    ? `Rep ${i + 1} bent to ${deg}°, reaching the ${TARGET}° target.`
    : `Rep ${i + 1} stopped at ${deg}°, ${deg - TARGET}° short of the ${TARGET}° target.`;
}

/** The line under the rep bars: the chosen rep, else the first rep short of the target, else that every rep reached it. */
export function sessionLine(depths: number[] | null, rep: number | null) {
  if (!depths) return "";
  if (rep !== null) return repLine(depths[rep], rep);
  const short = depths.findIndex((d) => reachedCount([d], TARGET) === 0);
  return short >= 0 ? repLine(depths[short], short) : `Every rep reached the ${TARGET}° target.`;
}

/** The physio's view of Maya's session: the deepest knee bend of each rep against the target. Sample data from the real clip. */
export function ReviewPanel() {
  const reps = useClipReps();
  const depths = reps?.map((r) => r.depth) ?? null;
  const [rep, setRep] = useState<number | null>(null);

  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <Image src="/images/avatars/maya.webp" alt="" width={44} height={44} unoptimized className="size-11 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="text-[17px] font-semibold leading-snug text-text">Maya&apos;s session, this morning</p>
          <p className="text-[15px] text-muted">Squats, set 1 of 3</p>
        </div>
      </div>

      <div className="mt-5 flex flex-1 flex-col border-t border-line pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[15px] text-muted">Deepest knee bend per rep</p>
          {depths && (
            <p className="text-[15px] font-semibold tabular-nums text-text">
              {reachedCount(depths, TARGET)} of {depths.length} reached {TARGET}°
            </p>
          )}
        </div>
        <RepBars
          depths={depths}
          target={TARGET}
          activeRep={rep}
          onRep={(i) => setRep((r) => (r === i ? null : i))}
          range={RANGE}
          className="mt-6 h-52"
        />
        <p aria-live="polite" className="mt-3 min-h-6 text-[15px] text-pretty text-muted">
          {sessionLine(depths, rep)}
        </p>
        <div className="mt-auto pt-5">
          <div className="flex items-start gap-3 rounded-lg border border-line bg-bg p-3.5">
            <Image src="/images/avatars/physio.webp" alt="" width={32} height={32} unoptimized className="size-8 shrink-0 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="text-[13px] text-muted">Plan updated</p>
              <p className="mt-0.5 text-[15px] text-text">Added split squats. Go slow on the way down.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
