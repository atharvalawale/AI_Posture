"use client";

import Image from "next/image";
import { useState } from "react";
import { useClipReps } from "@/components/pose/usePoseClip";
import { RepBars } from "@/components/product/RepBars";
import { reachedCount } from "@/lib/pose";

const TARGET = 100;

/** One rep against the target, in the words the physio reads. */
function repLine(depth: number, i: number) {
  const deg = Math.round(depth);
  return reachedCount([depth], TARGET) === 1
    ? `Rep ${i + 1} bent to ${deg}°, reaching the ${TARGET}° target.`
    : `Rep ${i + 1} stopped at ${deg}°, ${deg - TARGET}° short of the ${TARGET}° target.`;
}

/** The physio's view of Maya's session: the deepest knee bend of each rep against the target. Sample data from the real clip. */
export function ReviewPanel() {
  const reps = useClipReps();
  const depths = reps?.map((r) => r.depth) ?? null;
  const [rep, setRep] = useState<number | null>(null);
  const short = depths?.findIndex((d) => reachedCount([d], TARGET) === 0) ?? -1;

  let line = "";
  if (depths && rep !== null) line = repLine(depths[rep], rep);
  else if (depths && short >= 0) line = repLine(depths[short], short);
  else if (depths) line = `Every rep reached the ${TARGET}° target.`;

  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <Image src="/images/avatars/maya.webp" alt="" width={44} height={44} unoptimized className="size-11 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="text-[17px] font-semibold leading-snug text-text">Maya&apos;s session, Tuesday</p>
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
        <div className="mt-6 flex flex-1 flex-col">
          <RepBars
            depths={depths}
            target={TARGET}
            activeRep={rep}
            onRep={(i) => setRep((r) => (r === i ? null : i))}
            height="min-h-44 flex-1"
          />
        </div>
        <p aria-live="polite" className="mt-4 min-h-6 text-[15px] text-pretty text-muted">
          {line}
        </p>
      </div>
    </div>
  );
}
