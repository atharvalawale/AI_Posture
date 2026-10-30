"use client";

import { reachedCount } from "@/lib/pose";

type Props = {
  depths: number[] | null;
  target: number;
  activeRep?: number | null;
  onRep?: (i: number) => void;
  /** Knee angles at the bottom and the top of the bar track. A tighter range makes small differences visible. */
  range?: [number, number];
  /** Classes for the whole chart, degree labels included. Sets its height, so it replaces the default `h-44`. */
  className?: string;
};

// The bars and their degree labels share these sizes, so each label sits under its bar.
const COLUMN = "min-w-11 max-w-16 flex-1";
// Room on the right for the "100° target" label at the end of the line.
const LABEL_ROOM = "mr-22";

/** The deepest knee bend of each rep as a bar, against a dashed target line. A bar is a button that selects its rep. */
export function RepBars({ depths, target, activeRep = null, onRep, range = [60, 180], className = "h-44" }: Props) {
  if (!depths) {
    return (
      <div className={`flex items-center justify-center rounded-xl border border-line ${className}`}>
        <p className="text-[15px] text-muted">Loading the session</p>
      </div>
    );
  }

  const [lo, hi] = range;
  const heightOf = (angle: number) => Math.min(1, Math.max(0, (hi - angle) / (hi - lo)));

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
          <span className="pl-2 text-[13px] leading-none tabular-nums text-muted">{target}° target</span>
        </div>
        <div className={`relative flex h-full justify-around gap-3 ${LABEL_ROOM}`}>
          {depths.map((depth, i) => {
            const reached = reachedCount([depth], target) === 1;
            return (
              <button
                key={i}
                type="button"
                data-reached={reached}
                aria-label={`Rep ${i + 1}, ${Math.round(depth)}°, ${reached ? "reached" : "short of"} your target`}
                aria-pressed={activeRep === i}
                onClick={() => onRep?.(i)}
                className={`${COLUMN} flex cursor-pointer flex-col justify-end rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
              >
                <span
                  data-bar
                  className={`block w-full rounded-t-md transition-opacity ${reached ? "bg-accent" : "bg-line"} ${
                    activeRep !== null && activeRep !== i ? "opacity-60" : ""
                  }`}
                  style={{ height: `${heightOf(depth) * 100}%` }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div aria-hidden className={`flex justify-around gap-3 pt-2 ${LABEL_ROOM}`}>
        {depths.map((depth, i) => {
          const reached = reachedCount([depth], target) === 1;
          return (
            <span key={i} className={`${COLUMN} text-center text-[15px] tabular-nums ${reached ? "text-text" : "text-muted"}`}>
              {Math.round(depth)}°
            </span>
          );
        })}
      </div>
    </div>
  );
}
