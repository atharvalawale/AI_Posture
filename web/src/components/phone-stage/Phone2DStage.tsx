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
    let visible = true;
    const loop = (now: number) => {
      const { x, y } = tiltAt(progress.current, now / 1000);
      // CSS rotateX runs the other way round from three.js, rotateY the same way.
      el.style.transform = `perspective(1800px) rotateX(${(-x).toFixed(4)}rad) rotateY(${y.toFixed(4)}rad)`;
      raf = visible ? requestAnimationFrame(loop) : 0;
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    });
    io.observe(el);
    raf = requestAnimationFrame(loop);
    return () => {
      io.disconnect();
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
