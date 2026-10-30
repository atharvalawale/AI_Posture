"use client";

import { reached as isReached, type Direction } from "@/lib/pose";

type Props = {
  depths: number[] | null;
  target: number;
  activeRep?: number | null;
  onRep?: (i: number) => void;
  /** Lower is better for a knee bend (the default), higher for a raise. Sets which reps reached the target and which way bars grow. */
  direction?: Direction;
  /** Angles at the two ends of the bar track. A tighter range makes small differences visible. */
  range?: [number, number];
  /** Classes for the whole chart, degree labels included. Sets its height, so it replaces the default `h-44`. */
  className?: string;
};

// The bars and their degree labels share these sizes, so each label sits under its bar.
const COLUMN = "min-w-11 max-w-16 flex-1";
const ROW = "flex justify-around gap-3";

/**
 * Each rep's angle as a bar, against a dashed target line: by default the deepest knee bend, where a deeper bend
 * (a smaller angle) draws a taller bar. With `onRep` a bar is a button that selects its rep; without it, a labelled image.
 */
export function RepBars({ depths, target, activeRep = null, onRep, direction = "lower", range = [60, 180], className = "h-44" }: Props) {
  if (!depths) {
    return (
      <div className={`flex items-center justify-center rounded-xl border border-line ${className}`}>
        <p className="text-[15px] text-muted">Loading the session</p>
      </div>
    );
  }

  const [lo, hi] = range;
  const heightOf = (angle: number) => Math.min(1, Math.max(0, direction === "lower" ? (hi - angle) / (hi - lo) : (angle - lo) / (hi - lo)));

  return (
    <div className={`flex flex-col ${className}`}>
      {/* The line and the bars share this track, so a bar that reaches the target always meets the line. */}
      <div data-bar-track className="relative min-h-0 flex-1">
        <div
          aria-hidden
          data-target-line
          className="pointer-events-none absolute inset-x-0 flex translate-y-1/2 items-center"
          style={{ bottom: `${heightOf(target) * 100}%` }}
        >
          <span className="flex-1 border-t border-dashed border-muted" />
        </div>
        <div className={`relative h-full ${ROW}`}>
          {depths.map((depth, i) => {
            const reached = isReached(depth, target, direction);
            const label = `Rep ${i + 1}, ${Math.round(depth)}°, ${reached ? "reached" : "short of"} your target`;
            const bar = (
              <span
                data-bar
                className={`block w-full rounded-t-md transition-opacity ${reached ? "bg-accent" : "bg-muted/35"} ${
                  activeRep === null ? "" : activeRep === i ? "shadow-[inset_0_0_0_2px_var(--text)]" : "opacity-40"
                }`}
                style={{ height: `${heightOf(depth) * 100}%` }}
              />
            );
            return onRep ? (
              <button
                key={i}
                type="button"
                data-reached={reached}
                aria-label={label}
                aria-pressed={activeRep === i}
                onClick={() => onRep(i)}
                className={`${COLUMN} flex cursor-pointer flex-col justify-end rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
              >
                {bar}
              </button>
            ) : (
              <span key={i} role="img" data-reached={reached} aria-label={label} className={`${COLUMN} flex flex-col justify-end`}>
                {bar}
              </span>
            );
          })}
        </div>
      </div>
      <div aria-hidden className={`pt-2 ${ROW}`}>
        {depths.map((depth, i) => {
          const reached = isReached(depth, target, direction);
          return (
            <span
              key={i}
              className={`${COLUMN} text-center text-[15px] tabular-nums ${reached || activeRep === i ? "text-text" : "text-muted"} ${
                activeRep === i ? "font-semibold" : ""
              }`}
            >
              {Math.round(depth)}°
            </span>
          );
        })}
      </div>
      {/* A key under the chart rather than a label at the end of the line, so the bars stay centred on a phone. */}
      <p data-target-key className="mt-2 flex items-center gap-2 text-[13px] leading-5 tabular-nums text-muted">
        <span aria-hidden className="w-5 border-t border-dashed border-muted" />
        {target}° target
      </p>
    </div>
  );
}
