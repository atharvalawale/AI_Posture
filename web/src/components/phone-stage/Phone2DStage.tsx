"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { PhoneFrame, type ScreenId } from "@/components/phone/PhoneFrame";
import { ScreenStack } from "@/components/phone/ScreenStack";
import { tiltAt } from "./tilt";

/**
 * The 2D phone for devices without 3D (and while the 3D phone loads). Follows the same
 * scroll story with a CSS perspective tilt. `still` keeps it face-on (reduced motion).
 */
export function Phone2DStage({ progress, screen, width, still = false }: { progress: MutableRefObject<number>; screen: ScreenId; width: number; still?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || still) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const { x, y } = tiltAt(progress.current);
      // CSS rotateX runs the other way round from three.js, rotateY the same way.
      el.style.transform = `perspective(1800px) rotateX(${(-x).toFixed(4)}rad) rotateY(${y.toFixed(4)}rad)`;
    };
    // Scroll drives the tilt, so update once per frame while scrolling and rest otherwise.
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, [progress, still]);

  return (
    <div ref={ref} data-phone="2d">
      <PhoneFrame width={width}>
        <ScreenStack screen={screen} />
      </PhoneFrame>
    </div>
  );
}
