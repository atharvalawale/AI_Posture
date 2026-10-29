"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useRef, useState, type MutableRefObject, type RefObject } from "react";
import type { ScreenId } from "@/components/phone/PhoneFrame";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Scroll distance of the pinned story, in viewport heights. */
const STORY_LENGTH = 2.4;

export const SCREENS: readonly ScreenId[] = ["live", "summary", "plan"];

export function screenAt(progress: number): ScreenId {
  if (progress < 0.33) return "live";
  if (progress < 0.66) return "summary";
  return "plan";
}

/** Story progress in the middle of each screen's part of the story. */
const MIDDLE: Record<ScreenId, number> = { live: 0.165, summary: 0.5, plan: 0.83 };

function headerHeight() {
  return document.querySelector("header")?.getBoundingClientRect().height ?? 0;
}

/**
 * Pins `sectionRef` below the site header and tracks how far the visitor has scrolled.
 *
 * `progress.current` runs from -1 (section top at the bottom of the viewport) to 0 (section
 * pinned) while the section scrolls in, then from 0 to 1 while it stays pinned. It is a ref so
 * the phone can read it every frame without re-rendering. `screen` changes at 0.33 and 0.66.
 * With reduced motion nothing pins and progress stays at 0.
 * `goTo` scrolls smoothly to the middle of a screen's part of the story. `onProgress` calls a
 * listener after every progress change and returns the unsubscribe function.
 */
export function useScrollStory(sectionRef: RefObject<HTMLElement | null>): {
  progress: MutableRefObject<number>;
  screen: ScreenId;
  goTo: (screen: ScreenId) => void;
  onProgress: (fn: () => void) => () => void;
} {
  const progress = useRef(0);
  const listeners = useRef(new Set<() => void>());
  const story = useRef<ScrollTrigger | null>(null);
  const [screen, setScreen] = useState<ScreenId>("live");

  useGSAP(
    () => {
      const el = sectionRef.current;
      if (!el) return;
      ScrollTrigger.config({ ignoreMobileResize: true });
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // The enter trigger can report before the story trigger exists, so hold it in a box.
        const box: { story?: ScrollTrigger } = {};
        const sync = (enter: ScrollTrigger) => {
          const story = box.story;
          const p = story && story.progress > 0 ? story.progress : enter.progress - 1;
          progress.current = p;
          setScreen(screenAt(Math.max(0, p)));
          listeners.current.forEach((fn) => fn());
        };
        const enter = ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: () => `top ${headerHeight()}px`,
          invalidateOnRefresh: true,
          onUpdate: (self) => sync(self),
          onRefresh: (self) => sync(self),
        });
        box.story = ScrollTrigger.create({
          trigger: el,
          start: () => `top ${headerHeight()}px`,
          end: () => `+=${Math.round(window.innerHeight * STORY_LENGTH)}`,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: () => sync(enter),
          onRefresh: (self) => {
            // Published for tests and debugging: the scroll range of the pinned story.
            el.dataset.storyStart = String(Math.round(self.start));
            el.dataset.storyEnd = String(Math.round(self.end));
            sync(enter);
          },
        });
        story.current = box.story;
        // Fonts and the 3D phone can change layout after first paint.
        document.fonts?.ready.then(() => ScrollTrigger.refresh());
        return () => {
          story.current = null;
          delete el.dataset.storyStart;
          delete el.dataset.storyEnd;
        };
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        progress.current = 0;
        setScreen("live");
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  const goTo = useCallback((id: ScreenId) => {
    const st = story.current;
    if (!st) return;
    window.scrollTo({ top: st.start + (st.end - st.start) * MIDDLE[id], behavior: "smooth" });
  }, []);

  const onProgress = useCallback((fn: () => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  return { progress, screen, goTo, onProgress };
}
