"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useRef, useState, type MutableRefObject, type RefObject } from "react";
import type { ScreenId } from "@/components/phone/PhoneFrame";
import { PIN_QUERY } from "./pin";

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

/** How far the stage frame sits below the top of the section: 0 on desktop, the copy's height below 1024 px. */
function frameOffset(section: HTMLElement) {
  return section.querySelector<HTMLElement>("[data-stage-frame]")?.offsetTop ?? 0;
}

/**
 * Pins `sectionRef` and tracks how far the visitor has scrolled through the story.
 *
 * The pin starts when the section's `[data-stage-frame]` reaches the bottom of the site header.
 * On desktop the frame starts at the top of the stage. Below 1024 px the copy sits above the frame, so the copy
 * scrolls away first and then the phone and the readout pin.
 * `progress.current` runs from 0 (pin starts) to 1 (pin ends). It is a ref so the phone can read it
 * every frame without re-rendering. `screen` changes at 0.33 and 0.66.
 * With reduced motion, or when the viewport is too short for the pinned stack (`PIN_QUERY`),
 * nothing pins and progress stays at 0.
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

      mm.add(PIN_QUERY, () => {
        // The pin holds the section at the height its content had at the last refresh.
        const content = el.firstElementChild;
        let measured: number | null = null;
        const sync = (self: ScrollTrigger) => {
          progress.current = self.progress;
          setScreen(screenAt(self.progress));
          listeners.current.forEach((fn) => fn());
        };
        story.current = ScrollTrigger.create({
          trigger: el,
          start: () => `top+=${frameOffset(el)} top+=${headerHeight()}`,
          end: () => `+=${Math.round(window.innerHeight * STORY_LENGTH)}`,
          pin: true,
          // GSAP turns pin spacing off when the pinned element's parent is a flex container,
          // and <main> in layout.tsx is one. Without spacing the pin covers the next sections.
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: sync,
          onRefresh: (self) => {
            measured = content ? Math.round(content.getBoundingClientRect().height) : null;
            // Published for tests and debugging: the scroll range of the pinned story.
            el.dataset.storyStart = String(Math.round(self.start));
            el.dataset.storyEnd = String(Math.round(self.end));
            sync(self);
          },
        });
        // Fonts and the 3D phone can change layout after first paint.
        document.fonts?.ready.then(() => ScrollTrigger.refresh());
        // Some layout changes land after a refresh (on a resize across 640 px the readout switches
        // variant once React sees the new breakpoint), so refresh again whenever the content's
        // height no longer matches what the pin measured.
        // At most once a frame, so a live window resize does not re-measure every pin on every change.
        let raf = 0;
        const ro = new ResizeObserver(([entry]) => {
          if (measured === null || Math.round(entry.borderBoxSize[0].blockSize) === measured) return;
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => ScrollTrigger.refresh());
        });
        if (content) ro.observe(content);
        return () => {
          ro.disconnect();
          cancelAnimationFrame(raf);
          story.current = null;
          delete el.dataset.storyStart;
          delete el.dataset.storyEnd;
          // Unpinned (reduced motion, or a viewport too short for the stack): back to the live screen.
          progress.current = 0;
          setScreen("live");
          listeners.current.forEach((fn) => fn());
        };
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
