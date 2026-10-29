"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState, type MutableRefObject, type RefObject } from "react";
import type { ScreenId } from "@/components/phone/PhoneFrame";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Scroll distance of the pinned story, in viewport heights. */
const STORY_LENGTH = 2.4;

export function screenAt(progress: number): ScreenId {
  if (progress < 0.33) return "live";
  if (progress < 0.66) return "summary";
  return "plan";
}

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
 */
export function useScrollStory(sectionRef: RefObject<HTMLElement | null>): { progress: MutableRefObject<number>; screen: ScreenId } {
  const progress = useRef(0);
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
        // Fonts and the 3D phone can change layout after first paint.
        document.fonts?.ready.then(() => ScrollTrigger.refresh());
        return () => {
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

  return { progress, screen };
}
