"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { MAYA_WEEK, TODAY } from "@/lib/sample";

type Mode = "sheet" | "fiixbe";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
// Narrow no-break spaces keep the dose on one line. The narrowest days drop the spaces.
const DOSE = "3 × 10";
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

/*
 * A day's size comes from the strip's own width, not the viewport's: the strip is narrower on a 1024 px
 * desktop, where the section splits into two columns, than on a 768 px tablet. Three sizes:
 * - under 460 px: the shortest value ("3×10", a score, a mark for missed), centred in a 36 to 46 px day;
 * - from 460 px: words ("Missed", and "Today" for Sunday's name) at 13 px, scores at 20 px, in a day of 60 px or more;
 * - from 560 px: words at 15 px, scores at 24 px, in a day of 73 px or more.
 * Each threshold leaves room for the widest value ("Missed") inside the day's padding. Class names stay
 * literal (no template parts) so Tailwind finds them.
 */
/** Both modes sit in one grid cell, one over the other, so a day keeps its size and the switch is a crossfade. */
function Layer({ on, delay, className = "", children }: { on: boolean; delay: number; className?: string; children: ReactNode }) {
  const style: CSSProperties = { transitionDelay: on ? `${delay}ms` : "0ms" };
  return (
    <span
      style={style}
      className={`col-start-1 row-start-1 transition-[opacity,visibility] duration-300 motion-reduce:transition-none ${
        on ? "visible opacity-100" : "invisible opacity-0"
      } ${className}`}
    >
      {children}
    </span>
  );
}

function SheetValue() {
  return (
    <>
      <span className="text-[13px] leading-snug text-text @min-[460px]:hidden">{DOSE_TIGHT}</span>
      <span className="hidden text-[13px] leading-snug tabular-nums text-text @min-[460px]:inline @min-[560px]:text-[15px]">{DOSE}</span>
    </>
  );
}

function FiixbeValue({ day }: { day: (typeof MAYA_WEEK)[number] }) {
  const word = "sr-only @min-[460px]:not-sr-only @min-[460px]:text-[13px] @min-[460px]:font-semibold @min-[460px]:leading-snug @min-[560px]:text-[15px]";
  if (day === "missed") {
    return (
      <>
        <svg viewBox="0 0 24 24" className="size-3.5 text-warn @min-[460px]:hidden" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
        <span className={`${word} @min-[460px]:text-warn`}>Missed</span>
      </>
    );
  }
  return (
    <span className="text-[15px] font-semibold leading-snug tabular-nums text-text @min-[460px]:text-[20px] @min-[460px]:leading-tight @min-[560px]:text-[24px] @min-[560px]:tracking-[-0.01em]">
      {day}
    </span>
  );
}

/** One week of home exercise, two ways: from a printed sheet nobody sees, and with FiixBE, where every day has a score. */
export function WeekCompare({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("sheet");
  const fiixbe = mode === "fiixbe";

  return (
    <div className={`rounded-xl border border-line bg-surface p-4 sm:p-6 lg:p-5 ${className}`}>
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

      <div className="@container mt-5 sm:mt-6">
        <ol aria-label="One week of squats" className="grid grid-cols-7 gap-1 @min-[460px]:gap-1.5 @min-[560px]:gap-2">
          {DAYS.map((name, i) => {
            const day = MAYA_WEEK[i];
            const today = i === TODAY;
            const tone = fiixbe && day === "missed" ? "border-warn/50 bg-warn/10" : fiixbe && today ? "border-accent" : "border-line";
            return (
              <li
                key={name}
                data-day
                className={`grid min-w-0 content-start justify-items-center rounded-lg border bg-bg px-0 py-2.5 text-center transition-[background-color,border-color] duration-300 motion-reduce:transition-none @min-[460px]:px-1.5 @min-[560px]:px-2 @min-[560px]:py-3 ${tone}`}
              >
                {/* Today keeps its own name where there is room for it, and its session this morning gives it a score like any day. */}
                <span className={`text-[13px] leading-snug ${fiixbe && today ? "font-semibold text-accent" : "text-muted"}`}>
                  {today ? (
                    <>
                      <span className="@min-[460px]:hidden">{name}</span>
                      <span className="hidden @min-[460px]:inline">Today</span>
                    </>
                  ) : (
                    name
                  )}
                </span>
                {/* The value row is as tall as a score at every size, so a day with a word in one mode keeps its other value level with the rest. */}
                <span className="mt-1 grid min-h-[21px] w-full items-center justify-items-center @min-[460px]:min-h-[25px] @min-[560px]:min-h-[30px]">
                  <Layer on={!fiixbe} delay={i * 40} className="flex items-center justify-center">
                    <SheetValue />
                  </Layer>
                  <Layer on={fiixbe} delay={i * 40} className="flex items-center justify-center">
                    <FiixbeValue day={day} />
                  </Layer>
                </span>
              </li>
            );
          })}
        </ol>
        {/* What every day's value means, said once for the whole week. */}
        <p className="mt-3 grid text-[15px] leading-snug text-muted">
          <Layer on={!fiixbe} delay={0}>
            Squats, {DOSE} a day. Form unknown.
          </Layer>
          <Layer on={fiixbe} delay={0}>
            Each day&apos;s form score, out of 100.
          </Layer>
        </p>
      </div>

      <p aria-live="polite" className="mt-5 text-[17px] font-semibold leading-snug text-balance text-text sm:mt-6">
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
