"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import type { ScreenId } from "@/components/phone/PhoneFrame";
import { SCREENS } from "./useScrollStory";

const LABEL: Record<ScreenId, string> = { live: "Session", summary: "Summary", plan: "Plan" };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Three short tracks under the phone, one per screen, that fill as the story scrolls.
 * Each one is a button that scrolls to its screen.
 */
export function ChapterRail({
  progress,
  onProgress,
  screen,
  onSelect,
}: {
  progress: MutableRefObject<number>;
  onProgress: (fn: () => void) => () => void;
  screen: ScreenId;
  onSelect: (id: ScreenId) => void;
}) {
  const fills = useRef<(HTMLSpanElement | null)[]>([]);

  // Written straight to the DOM on every progress change, without re-rendering.
  useEffect(() => {
    const apply = () => {
      const p = Math.max(0, progress.current);
      fills.current.forEach((el, i) => {
        if (el) el.style.scale = `${clamp01(p * SCREENS.length - i).toFixed(4)} 1`;
      });
    };
    apply();
    return onProgress(apply);
  }, [progress, onProgress]);

  return (
    <nav aria-label="App screens" className="grid w-full grid-cols-3 gap-2.5">
      {SCREENS.map((id, i) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          aria-current={id === screen ? "step" : undefined}
          // The ::after reaches 4 px past the top and bottom, so the touch target is 44 px tall without moving anything.
          className="group relative cursor-pointer rounded-sm pt-1.5 text-left after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <span className="relative block h-[3px] overflow-hidden rounded-full bg-line">
            <span
              ref={(el) => {
                fills.current[i] = el;
              }}
              className="absolute inset-0 origin-left scale-x-0 rounded-full bg-accent"
            />
          </span>
          <span
            className={`mt-2 block text-[13px] transition-colors duration-300 group-hover:text-text ${id === screen ? "font-medium text-text" : "text-muted"}`}
          >
            {LABEL[id]}
          </span>
        </button>
      ))}
    </nav>
  );
}
