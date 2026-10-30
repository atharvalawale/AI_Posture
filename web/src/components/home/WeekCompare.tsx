"use client";

import { useState } from "react";

type Mode = "sheet" | "fiixbe";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
// Sample form scores for one week, in the product view only. Wednesday was missed and Sunday is today.
const WEEK: (number | "missed" | "today")[] = [84, 88, "missed", 90, 91, 93, "today"];
// Narrow no-break spaces keep the dose on one line in a narrow day. A phone's day is narrower still, so there it drops the spaces.
const DOSE = "3\u202f×\u202f10";
const DOSE_TIGHT = "3×10";

const CHANGES = [
  "Your phone camera watches your form on every rep, live.",
  "Reps are counted for you, and every rep gets a score from 0 to 100.",
  "Your physiotherapist sees every session without you travelling to the clinic.",
  "It runs in the browser on any phone with a camera. No extra hardware.",
] as const;

const MODES: { id: Mode; label: string }[] = [
  { id: "sheet", label: "From a printed sheet" },
  { id: "fiixbe", label: "With FiixBE" },
];

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
// Both modes sit in each day, one over the other, so a day keeps its size and the switch is a crossfade.
const layer = "col-start-1 row-start-1 flex flex-col items-center transition-opacity duration-300 motion-reduce:transition-none sm:items-start";

function SheetDay() {
  return (
    <>
      <span className="hidden text-[15px] leading-snug text-text sm:block">Squats</span>
      <span className="text-[13px] leading-snug tabular-nums text-text sm:hidden">{DOSE_TIGHT}</span>
      <span className="hidden text-[15px] leading-snug tabular-nums text-text sm:block">{DOSE}</span>
      <span className="mt-1 hidden text-[13px] leading-snug text-muted sm:block">Form unknown</span>
    </>
  );
}

function FiixbeDay({ day }: { day: (typeof WEEK)[number] }) {
  if (day === "missed") {
    return (
      <>
        <span aria-hidden className="text-[15px] font-semibold leading-snug text-warn sm:hidden">
          -
        </span>
        <span className="sr-only sm:not-sr-only sm:text-[15px] sm:font-semibold sm:leading-snug sm:text-warn">Missed</span>
      </>
    );
  }
  if (day === "today") {
    // "Today" is wider than a phone's day, so there the accent day and a dot mark it.
    return (
      <>
        <span aria-hidden className="mt-[7px] size-1.5 rounded-full bg-accent sm:hidden" />
        <span className="sr-only sm:not-sr-only sm:text-[15px] sm:font-semibold sm:leading-snug sm:text-accent">Today</span>
      </>
    );
  }
  return (
    <>
      <span className="text-[15px] font-semibold leading-snug tabular-nums text-text sm:text-[24px] sm:leading-tight sm:tracking-[-0.01em]">{day}</span>
      <span className="hidden text-[13px] leading-snug text-muted sm:block">Form score</span>
    </>
  );
}

/** One week of home exercise, two ways: from a printed sheet nobody sees, and with FiixBE, where every day has a score. */
export function WeekCompare({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("sheet");
  const fiixbe = mode === "fiixbe";

  return (
    <div className={`rounded-xl border border-line bg-surface p-4 sm:p-6 ${className}`}>
      <div role="group" aria-label="Compare a week" className="flex gap-1 rounded-lg bg-surface-2 p-1">
        {MODES.map((m) => {
          const on = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              onClick={() => setMode(m.id)}
              className={`min-h-11 flex-auto cursor-pointer rounded-md border px-3 text-[14px] font-medium transition-[background-color,border-color,color] duration-200 sm:px-4 sm:text-[15px] ${focus} ${
                on ? "border-line bg-surface text-text shadow-[0_2px_8px_-4px_rgb(0_0_0/0.2)]" : "border-transparent text-muted hover:text-text"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <ol aria-label="One week of squats" className="mt-5 grid grid-cols-7 gap-1 sm:mt-6 sm:gap-2">
        {DAYS.map((name, i) => {
          const day = WEEK[i];
          const tone =
            fiixbe && day === "missed" ? "border-warn/50 bg-warn/10" : fiixbe && day === "today" ? "border-accent" : "border-line";
          return (
            <li
              key={name}
              data-day
              className={`grid min-w-0 content-start rounded-lg border bg-bg px-0.5 py-2.5 text-center transition-[background-color,border-color] duration-300 motion-reduce:transition-none sm:px-2.5 sm:py-3 sm:text-left ${tone}`}
            >
              <span className={`text-[13px] leading-snug ${fiixbe && day === "today" ? "font-semibold text-accent" : "text-muted"}`}>{name}</span>
              <span className="mt-1 grid">
                <span className={`${layer} ${fiixbe ? "invisible opacity-0" : "opacity-100"}`} style={{ transitionDelay: fiixbe ? "0ms" : `${i * 40}ms` }}>
                  <SheetDay />
                </span>
                <span className={`${layer} ${fiixbe ? "opacity-100" : "invisible opacity-0"}`} style={{ transitionDelay: fiixbe ? `${i * 40}ms` : "0ms" }}>
                  <FiixbeDay day={day} />
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <p aria-live="polite" className="mt-5 text-[17px] font-semibold leading-snug text-text sm:mt-6">
        {fiixbe ? "Your physio sees every rep, every day." : "Your physio sees nothing until your next visit."}
      </p>
      {fiixbe && (
        <ul className="mt-4 grid gap-3 border-t border-line pt-4">
          {CHANGES.map((c) => (
            <li key={c} className="flex gap-3 text-[15px] leading-relaxed text-muted text-pretty">
              <svg viewBox="0 0 24 24" className="mt-[5px] size-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
