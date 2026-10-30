"use client";

import { useLayoutEffect, useRef, type MutableRefObject } from "react";
import { PhoneFrame, type ScreenId } from "@/components/phone/PhoneFrame";
import { ScreenStack, type StoryProgress } from "@/components/phone/ScreenStack";
import type { LiveSession } from "@/lib/pose";
import { introTilt, swayAt } from "./tilt";
import type { PhoneLean } from "./usePhoneGestures";

/**
 * The 2D phone for devices without 3D (and while the 3D phone loads). Turns in as the page loads,
 * sways with the scroll story through a CSS perspective tilt, and leans toward the cursor.
 * `still` keeps it face-on (reduced motion).
 */
export function Phone2DStage({
  progress,
  screen,
  session,
  story,
  width,
  lean,
  introStart,
  still = false,
}: {
  progress: MutableRefObject<number>;
  screen: ScreenId;
  /** Drives the live screen. Leave it out while this phone is not the one on show. */
  session?: LiveSession;
  story?: StoryProgress;
  width: number;
  /** The visitor's own lean of the phone, added on top of the intro and the sway. */
  lean: PhoneLean;
  /** performance.now() when the intro started. Shared with the 3D phone so a hand-over never restarts it. */
  introStart: number;
  still?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // A layout effect, so the first paint already has the phone turned where the intro and the scroll put it.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || still) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const elapsed = performance.now() - introStart;
      const intro = introTilt(elapsed);
      const sway = swayAt(progress.current);
      const x = intro.x + sway.x + lean.state.current.x;
      const y = intro.y + sway.y + lean.state.current.y;
      // CSS rotateX runs the other way round from three.js, rotateY the same way.
      el.style.transform = `perspective(1800px) rotateX(${(-x).toFixed(4)}rad) rotateY(${y.toFixed(4)}rad)`;
      // Every frame until the intro ends. After that, only when scroll or lean changes.
      if (intro.x !== 0 || intro.y !== 0) schedule();
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const unsubscribe = lean.subscribe(schedule);
    apply();
    return () => {
      unsubscribe();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, [progress, lean, still, introStart]);

  return (
    <div ref={ref} data-phone="2d">
      <PhoneFrame width={width}>
        <ScreenStack screen={screen} session={session} story={story} />
      </PhoneFrame>
    </div>
  );
}
