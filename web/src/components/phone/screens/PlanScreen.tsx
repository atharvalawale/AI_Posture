"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { PLAN_ITEMS } from "@/lib/sample";

/** Today's plan: the exercises the physio set, with a note from them. Squats tick off when the screen shows. */
export function PlanScreen({ active = true }: { active?: boolean }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => setDone(true), 650);
    return () => {
      window.clearTimeout(id);
      setDone(false);
    };
  }, [active]);

  return (
    <div className="flex h-full flex-col bg-bg px-4 pb-4 pt-[44px] text-text">
      <div className="flex items-center justify-between">
        <p className="pl-1 text-[13px] text-muted">Tuesday</p>
        <Image src="/images/avatars/maya.webp" alt="" width={32} height={32} unoptimized className="h-8 w-8 rounded-full object-cover" />
      </div>
      <p className="mt-2.5 px-1 text-[26px] font-semibold leading-[1.1] tracking-[-0.02em]">Good morning, Maya</p>
      <p className="mt-1.5 px-1 text-sm text-muted">Week 3 of your knee recovery plan</p>

      <ul className="mt-4 grid gap-2">
        {PLAN_ITEMS.map((item, i) => {
          const checked = i === 0 && done;
          return (
            <li key={item.name} className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-2.5 pr-3">
              <Image src={item.img} alt="" width={46} height={46} unoptimized className="h-[46px] w-[46px] rounded-[10px] object-cover" />
              <div className={`flex-1 text-sm font-semibold transition-colors duration-300 ${checked ? "text-muted" : ""}`}>
                {item.name}
                <span className="mt-0.5 block text-xs font-normal text-muted">{item.dose}</span>
              </div>
              <span
                aria-label={checked ? "Done" : undefined}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-300 ${checked ? "border-accent bg-accent text-on-accent" : "border-line"}`}
              >
                <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-opacity duration-300 ${checked ? "opacity-100" : "opacity-0"}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 12.5l4 4 8-9" />
                </svg>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto rounded-2xl bg-surface-2 p-3.5 text-[13px] leading-[1.45]">
        <div className="mb-2 flex items-center gap-2.5 font-semibold">
          <Image src="/images/avatars/physio.webp" alt="" width={30} height={30} unoptimized className="h-[30px] w-[30px] rounded-full object-cover" />
          Your physio
        </div>
        Your depth is much better this week. I have added split squats. Go slow on the way down.
      </div>
      <div aria-hidden="true" className="mt-3 flex h-12 items-center justify-center rounded-[10px] bg-accent text-[15px] font-medium text-on-accent">
        Start today&apos;s session
      </div>
    </div>
  );
}
