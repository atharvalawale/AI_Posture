"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { PoseFigure, figureBounds, toSvg, type FigureBounds } from "@/components/pose/PoseFigure";
import { usePoseClip } from "@/components/pose/usePoseClip";
import { useShowcase } from "@/components/showcase/useShowcase";
import { standingPose } from "@/lib/pose";
import { EXERCISES } from "@/lib/session/protocol";
import { AREAS, type Area } from "./bodyAreas";

/** The area each hotspot selects. One hotspot per landmark. */
const HOTSPOTS: { landmark: number; area: Area }[] = [
  { landmark: 11, area: "shoulder" },
  { landmark: 23, area: "hip" },
  { landmark: 25, area: "knee" },
];
/** Hit radius and dot radius in screen pixels. The hit circle is 44 px across. */
const HIT_PX = 22;
const DOT_PX = 7;
const RING_PX = 15;

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Screen pixels per SVG unit for an SVG drawn with `bounds` and the default `xMidYMid meet`. Null until measured. */
function usePixelsPerUnit(ref: RefObject<HTMLElement | null>, bounds: FigureBounds | null) {
  const [scale, setScale] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !bounds) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width && height) setScale(Math.min(width / bounds.w, height / bounds.h));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, bounds]);
  return scale;
}

/**
 * Built for rehab after surgery and injury: a standing figure from the tracked squat with hotspots at the
 * shoulder, hip and knee, a row of area buttons, and a panel with the condition, the exercise FiixBE
 * runs for it today and the angle it measures. The buttons are the keyboard and screen reader path;
 * the hotspots are a pointer shortcut to the same choice.
 */
export function BodyMap() {
  const clip = usePoseClip();
  const { active, select, tabProps, panelId, tabId } = useShowcase(AREAS.length);
  const area = AREAS[active];
  const figureRef = useRef<HTMLDivElement>(null);

  const figure = useMemo(() => {
    if (!clip) return null;
    const aspect = clip.h / clip.w;
    const pose = standingPose(clip);
    return { aspect, pose, bounds: figureBounds([pose], aspect, 60) };
  }, [clip]);
  // Before the first measure, assume the figure is drawn about 420 px tall.
  const scale = usePixelsPerUnit(figureRef, figure?.bounds ?? null) ?? (figure ? 420 / figure.bounds.h : 1);

  return (
    <div data-body-map className="grid gap-8 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:items-start sm:gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
      <div className="grid justify-items-center gap-8">
        <div ref={figureRef} className="h-[380px] w-full sm:h-[440px]">
          {figure && (
            <PoseFigure pose={figure.pose} aspect={figure.aspect} bounds={figure.bounds} highlight={area.landmarks} className="h-full w-full">
              {HOTSPOTS.map(({ landmark, area: id }) => {
                const [x, y] = toSvg(figure.pose, landmark, figure.aspect);
                const on = area.landmarks.includes(landmark);
                const index = AREAS.findIndex((a) => a.id === id);
                return (
                  <g
                    key={landmark}
                    data-hotspot={id}
                    data-on={on}
                    className="cursor-pointer"
                    onClick={() => select(index)}
                    onPointerMove={(e) => {
                      if (e.pointerType === "mouse" && index !== active) select(index);
                    }}
                  >
                    <circle cx={x} cy={y} r={HIT_PX / scale} fill="transparent" />
                    <circle cx={x} cy={y} r={RING_PX / scale} className={`transition-opacity duration-200 ${on ? "fill-accent/15 opacity-100" : "opacity-0"}`} />
                    <circle
                      cx={x}
                      cy={y}
                      r={DOT_PX / scale}
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                      className={`transition-colors duration-200 ${on ? "fill-accent stroke-accent" : "fill-bg stroke-accent"}`}
                    />
                  </g>
                );
              })}
            </PoseFigure>
          )}
        </div>

        <div role="tablist" aria-label="Areas of the body" className="grid w-full max-w-[340px] grid-cols-2 gap-2">
          {AREAS.map((a, i) => (
            <button
              key={a.id}
              type="button"
              {...tabProps(i)}
              className={`min-h-11 cursor-pointer rounded-lg border px-4 text-[15px] whitespace-nowrap transition-colors ${focus} ${
                active === i ? "border-text text-text" : "border-line text-muted hover:text-text"
              }`}
            >
              {a.button}
            </button>
          ))}
        </div>
      </div>

      {/* Starts level with the figure's shoulders, so every area's title sits at the same height. */}
      <div className="grid sm:pt-[72px]">
        {AREAS.map((a, i) => {
          const on = active === i;
          const exercise = a.exercise ? EXERCISES.find((e) => e.key === a.exercise) : undefined;
          return (
            <div
              key={a.id}
              role="tabpanel"
              id={panelId(i)}
              aria-labelledby={tabId(i)}
              inert={!on}
              // Stacked in one cell from 640 px so the layout keeps the tallest panel's height. On phones a hidden panel takes no space.
              // Visibility flips only after the fade, so the outgoing panel fades out too.
              className={`col-start-1 row-start-1 transition-[opacity,visibility] duration-300 motion-reduce:transition-none ${on ? "visible opacity-100" : "invisible opacity-0 max-sm:hidden"}`}
            >
              <h3 className="font-serif text-[28px] leading-[1.15] tracking-[-0.01em] text-balance">{a.condition}</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-pretty text-muted">{a.body}</p>
              {exercise && (
                <>
                  <div className="mt-6 flex items-center gap-4 border-t border-line pt-6">
                    <Image
                      src={`/images/session/${exercise.key}.webp`}
                      alt=""
                      width={96}
                      height={96}
                      className="size-24 shrink-0 rounded-xl bg-surface-2 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-[17px] font-semibold leading-snug">{exercise.name}</p>
                      <p className="mt-1 text-[15px] leading-snug text-pretty text-muted">{exercise.description}</p>
                    </div>
                  </div>
                  <p className="mt-6 text-[15px] text-muted">FiixBE measures the {exercise.angleLabel.toLowerCase()} angle.</p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
