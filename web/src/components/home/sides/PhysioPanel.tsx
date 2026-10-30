"use client";

import Image from "next/image";
import { useState } from "react";
import { useClipRepsStatus } from "@/components/pose/usePoseClip";
import { RepBars } from "@/components/product/RepBars";
import { reachedCount } from "@/lib/pose";
import { MAYA, MAYA_SESSION } from "@/lib/sample";
import { RANGE, TARGET, sessionLine } from "../how/ReviewPanel";

/** The physio's side: Maya's squats as they arrive from her phone, each rep's deepest knee bend against the target. Sample data from the real clip. */
export function PhysioPanel() {
  const { reps, failed } = useClipRepsStatus();
  const depths = reps?.map((r) => r.depth) ?? null;
  const [rep, setRep] = useState<number | null>(null);

  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <Image src="/images/avatars/maya.webp" alt="" width={44} height={44} unoptimized className="size-11 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="text-[17px] font-semibold leading-snug text-text">{MAYA.name}</p>
          <p className="text-[15px] text-muted">Squats, sent from Maya&apos;s phone this morning</p>
        </div>
      </div>

      {/* The panel takes the phone's height beside it, so the chart sits in the middle of the room it gets. */}
      <div className="mt-5 flex flex-1 flex-col border-t border-line pt-5">
        <div className="my-auto">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-[15px] text-muted">{MAYA_SESSION.setLabel}, deepest knee bend</p>
            {depths && (
              <p className="text-[15px] font-semibold tabular-nums text-text">
                {reachedCount(depths, TARGET)} of {depths.length} reached {TARGET}°
              </p>
            )}
          </div>
          <RepBars
            depths={depths}
            target={TARGET}
          failed={failed}
            activeRep={rep}
            onRep={(i) => setRep((r) => (r === i ? null : i))}
            range={RANGE}
            className="mt-6 h-52"
          />
          <p aria-live="polite" className="mt-3 min-h-6 text-[15px] text-pretty text-muted">
            {sessionLine(depths, rep)}
          </p>
        </div>
      </div>
    </div>
  );
}
