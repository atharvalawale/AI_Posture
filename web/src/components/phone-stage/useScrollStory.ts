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

/**
 * Hysteresis for the fit check, in CSS pixels. A pinned stage lets go once the stack is this much
 * taller than the room under the header; an unpinned one pins again once it is this much shorter.
 */
const FIT_SLACK = 1;

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
 * How much room under the header the stack that pins needs: from the top of `[data-stage-frame]`
 * to the lowest part that pins with it (the frame's rows, and on desktop the left column beside
 * them), laid out as it is when pinned. Infinity if a part pokes out above the frame.
 *
 * While unpinned, the chapter rail (`[data-stage-rail]`) is collapsed below 1024 px. To measure
 * the pinned layout anyway, the rail is opened for the measurement and closed again in the same
 * task, so nothing paints in between and ResizeObserver never sees it.
 */
function pinnedHeight(section: HTMLElement): number {
  const frame = section.querySelector<HTMLElement>("[data-stage-frame]");
  if (!frame) return Infinity;
  const rail = section.querySelector<HTMLElement>("[data-stage-rail]");
  const railHeight = rail?.style.height ?? "";
  if (rail) rail.style.height = "auto";
  try {
    const top = frame.getBoundingClientRect().top;
    const parts = [...frame.children];
    const left = frame.previousElementSibling;
    if (left && Math.abs(left.getBoundingClientRect().top - top) < 1) parts.push(...left.children);
    let bottom = top;
    for (const part of parts) {
      const r = part.getBoundingClientRect();
      if (r.height === 0) continue;
      if (r.top < top - 0.5) return Infinity;
      bottom = Math.max(bottom, r.bottom);
    }
    return bottom - top;
  } finally {
    if (rail) rail.style.height = railHeight;
  }
}

/**
 * Pins `sectionRef`, when the stack that pins fits the viewport, and tracks how far the visitor has
 * scrolled through the story.
 *
 * The pin starts when the section's `[data-stage-frame]` reaches the bottom of the site header.
 * On desktop the frame starts at the top of the stage. Below 1024 px the copy sits above the frame,
 * so the copy scrolls away first and then the phone and the readout pin.
 * `pinned` is whether it pins. It is checked at run time, whenever the stage's content or the
 * window changes size and when fonts load: the stack must fit under the header (`pinnedHeight`),
 * with a little hysteresis. It is false with reduced motion. It starts true (also on the server),
 * since most viewports fit, so they render their final layout at once.
 * `progress.current` runs from 0 (pin starts) to 1 (pin ends). It is a ref so the phone can read it
 * every frame without re-rendering. `screen` changes at 0.33 and 0.66. While unpinned, progress
 * stays at 0 and the screen is the live one.
 * `goTo` scrolls smoothly to the middle of a screen's part of the story. `onProgress` calls a
 * listener after every progress change and returns the unsubscribe function.
 */
export function useScrollStory(sectionRef: RefObject<HTMLElement | null>): {
  progress: MutableRefObject<number>;
  screen: ScreenId;
  pinned: boolean;
  goTo: (screen: ScreenId) => void;
  onProgress: (fn: () => void) => () => void;
} {
  const progress = useRef(0);
  const listeners = useRef(new Set<() => void>());
  const story = useRef<ScrollTrigger | null>(null);
  const [screen, setScreen] = useState<ScreenId>("live");
  const [pinned, setPinned] = useState(true);

  useGSAP(
    () => {
      const el = sectionRef.current;
      if (!el) return;
      ScrollTrigger.config({ ignoreMobileResize: true });
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const content = el.firstElementChild;
        // The pin holds the section at the height its content had at the last refresh.
        let measured: number | null = null;
        const notify = () => listeners.current.forEach((fn) => fn());
        const sync = (self: ScrollTrigger) => {
          progress.current = self.progress;
          setScreen(screenAt(self.progress));
          notify();
        };

        const pin = () =>
          ScrollTrigger.create({
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
        const unpin = () => {
          story.current?.kill();
          story.current = null;
          measured = null;
          delete el.dataset.storyStart;
          delete el.dataset.storyEnd;
          progress.current = 0;
          setScreen("live");
          notify();
        };

        // Pin when the stack fits under the header, let go when it does not.
        let disposed = false;
        const check = () => {
          if (disposed) return;
          const need = pinnedHeight(el);
          const room = window.innerHeight - headerHeight();
          // Published for tests and debugging: how tall the pinned stack is.
          el.dataset.stageNeed = String(Math.ceil(need));
          const fits = story.current ? need <= room + FIT_SLACK : need <= room - FIT_SLACK;
          if (fits && !story.current) story.current = pin();
          else if (!fits && story.current) unpin();
          setPinned(fits);
        };
        check();

        // Content and window changes, at most once a frame, so a live window resize does not
        // re-measure every pin on every change. Some layout changes land after a refresh (on a
        // resize across 640 px the readout switches variant once React sees the new breakpoint),
        // so refresh again whenever the content's height no longer matches what the pin measured.
        let raf = 0;
        const recheck = () => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            check();
            const h = content ? Math.round(content.getBoundingClientRect().height) : null;
            if (story.current && measured !== null && h !== measured) ScrollTrigger.refresh();
          });
        };
        const ro = new ResizeObserver(recheck);
        if (content) ro.observe(content);
        window.addEventListener("resize", recheck);
        // Fonts can change layout after first paint.
        document.fonts?.ready.then(() => {
          check();
          if (story.current) ScrollTrigger.refresh();
        });
        return () => {
          disposed = true;
          ro.disconnect();
          window.removeEventListener("resize", recheck);
          cancelAnimationFrame(raf);
          unpin();
          delete el.dataset.stageNeed;
        };
      });

      mm.add("(prefers-reduced-motion: reduce)", () => setPinned(false));

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

  return { progress, screen, pinned, goTo, onProgress };
}
