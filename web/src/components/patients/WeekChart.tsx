"use client";

type Props = {
  /** Deepest knee angle per week, week 1 first. */
  depths: number[];
  /** The selected week, from 1. */
  week: number;
  onWeek: (week: number) => void;
  /** Target knee angle, drawn as a dashed line. */
  target: number;
};

/** Points sit this far in from the left and right edges, in percent, so the end buttons stay inside the chart. */
const INSET = 6;
/** Degrees of room above the deepest point and below the shallowest. */
const MARGIN = 8;

/**
 * Deepest knee bend per week: one point per week joined by a line, with the target as a dashed line.
 * A deeper bend sits higher. Weeks up to the selected one are drawn in accent, later weeks are faint.
 * Every point is a button that selects its week.
 */
export function WeekChart({ depths, week, onWeek, target }: Props) {
  const lo = Math.min(target, ...depths) - MARGIN;
  const hi = Math.max(target, ...depths) + MARGIN;
  // Percent from the top: a smaller angle (a deeper bend) is higher.
  const top = (angle: number) => ((angle - lo) / (hi - lo)) * 100;
  const left = (i: number) => (depths.length < 2 ? 50 : INSET + (i / (depths.length - 1)) * (100 - INSET * 2));
  const points = depths.map((d, i) => ({ x: left(i), y: top(d) }));
  const targetY = top(target);

  return (
    <div>
      <div className="relative h-36">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <line
            x1={0}
            x2={100}
            y1={targetY}
            y2={targetY}
            className="stroke-muted"
            strokeWidth={1}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
            data-target-line
          />
          {points.slice(1).map((p, i) => {
            const from = points[i];
            // Segment i joins week i + 1 to week i + 2.
            const reached = i + 2 <= week;
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={p.x}
                y2={p.y}
                className={reached ? "stroke-accent" : "stroke-muted"}
                strokeWidth={2}
                // Weeks still to come stay visible as a dashed curve, so the whole recovery reads at week 1.
                strokeDasharray={reached ? undefined : "3 4"}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        <span
          aria-hidden="true"
          className="absolute left-0 pt-1.5 text-[13px] leading-none text-muted"
          style={{ top: `${targetY}%` }}
        >
          Target {target}°
        </span>
        {depths.map((d, i) => {
          const n = i + 1;
          const on = n === week;
          const reached = n <= week;
          return (
            <button
              key={n}
              type="button"
              aria-label={`Week ${n}, ${Math.round(d)}°`}
              aria-pressed={on}
              onClick={() => onWeek(n)}
              className="group absolute flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
              style={{ left: `${points[i].x}%`, top: `${points[i].y}%` }}
            >
              <span
                className={`block rounded-full border-2 transition-[width,height,background-color,border-color] duration-200 ${
                  on
                    ? "size-4 border-accent bg-accent"
                    : reached
                      ? "size-3 border-accent bg-bg group-hover:size-3.5"
                      : "size-3 border-line bg-bg group-hover:size-3.5 group-hover:border-muted"
                }`}
              />
            </button>
          );
        })}
      </div>
      <div aria-hidden="true" className="relative mt-2 h-5 text-[13px] tabular-nums text-muted">
        {depths.map((_, i) => (
          <span
            key={i}
            className={`absolute -translate-x-1/2 ${i + 1 === week ? "font-semibold text-text" : ""}`}
            style={{ left: `${points[i].x}%` }}
          >
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
