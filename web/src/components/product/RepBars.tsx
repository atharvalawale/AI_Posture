"use client";

import { reachedCount } from "@/lib/pose";


type Props = {
  depths: number[] | null;
  target: number;
  activeRep?: number | null;
  onRep?: (i: number) => void;
  range?: [number, number];
  /** Height classes for the chart, labels included. Pass `flex-1` to fill a flex column. */
  height?: string;
};

export function RepBars({ depths, target, activeRep = null, onRep, range = [60, 180], height = "h-44" }: Props) {
  if (!depths) {
    return (
      <div className={`flex ${height} items-center justify-center rounded-xl border border-line`}>
        <p className="text-[15px] text-muted">Loading the session</p>
      </div>
    );
  }

  const [lo, hi] = range;
  const heightOf = (angle: number) => Math.min(1, Math.max(0, (hi - angle) / (hi - lo)));
  const targetBottom = `${heightOf(target) * 100}%`;

  return (
    <div className={`relative ${height}`}>
      <div
        aria-hidden
        data-target-line
        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted"
        style={{ bottom: targetBottom }}
      />
      <div className="relative flex h-full items-stretch justify-center gap-3">
        {depths.map((depth, i) => {
          const rounded = Math.round(depth);
          const reached = reachedCount([depth], target) === 1;
          return (
            <button
              key={i}
              type="button"
              data-reached={reached}
              aria-label={`Rep ${i + 1}, ${rounded}°, ${reached ? "reached" : "short of"} your target`}
              aria-pressed={activeRep === i}
              onClick={() => onRep?.(i)}
              className="group flex min-w-11 flex-1 cursor-pointer flex-col justify-end rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:max-w-24"
            >
              <span className="flex min-h-0 flex-1 items-end">
                <span
                  className={`block w-full rounded-t-md transition-opacity ${reached ? "bg-accent" : "bg-line"} ${
                    activeRep !== null && activeRep !== i ? "opacity-60" : ""
                  }`}
                  style={{ height: `${heightOf(depth) * 100}%` }}
                />
              </span>
              <span className={`pt-2 text-[15px] tabular-nums ${reached ? "text-text" : "text-muted"}`}>{rounded}°</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
