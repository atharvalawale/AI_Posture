"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { angleGeometry, exerciseImage, exercisePose, measuredAngle, poseFor } from "@/lib/session/exercise-pose";
import { getExercise, type ExerciseKey, type Side } from "@/lib/session/protocol";

// Drawn over a photo, so these stay the same in both themes (like the live skeleton).
const LINE = "#5ED6C6";
const OUTLINE = "rgba(6,20,22,.55)";
const DRAW_MS = 900;

/** Counts up to `to` over DRAW_MS with an ease-out, restarting whenever `key` changes. */
function useCountUp(to: number, key: string) {
  const [value, setValue] = useState(to);
  useEffect(() => {
    // With reduced motion the first frame shows the final value.
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : DRAW_MS;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = duration ? Math.min(1, (now - start) / duration) : 1;
      setValue(Math.round(to * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, key]);
  return value;
}

/**
 * The selected exercise as FiixBE sees it: a photo with the pose landmarks MediaPipe found in it,
 * the two limbs of the measured joint, and the angle between them. Mirrors for the other side.
 */
export function ExercisePreview({ exercise, side }: { exercise: ExerciseKey; side: Side }) {
  const pose = exercisePose(exercise);
  const { angleLabel } = getExercise(exercise);
  const { mirrored, points, landmarks } = poseFor(pose, side);
  const [a, b, c] = points;
  const measured = measuredAngle(exercise, pose.angle, points);
  const { arc, out } = angleGeometry(measured.arcPoints, 78);
  const key = `${exercise}-${side}`;
  const degrees = useCountUp(measured.degrees, key);
  // Anchored on the photo just past the arc, then pushed off by its own size so it never covers
  // the joint, whatever size the photo is shown at.
  const { at, dir } = measured.label ?? { at: [b[0] + out[0] * 90, b[1] + out[1] * 90], dir: out };
  const label = {
    left: `${(at[0] / pose.w) * 100}%`,
    top: `${(at[1] / pose.h) * 100}%`,
    translate: `calc(-50% + ${dir[0].toFixed(3)} * (50% + 6px)) calc(-50% + ${dir[1].toFixed(3)} * (50% + 6px))`,
  };

  return (
    <figure className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#1c2224]" data-exercise-preview={exercise} data-side={side}>
      <Image
        src={exerciseImage(exercise)}
        alt=""
        fill
        loading="eager"
        sizes="(min-width: 1024px) 620px, 100vw"
        className={`object-cover brightness-[.82] saturate-[.85] transition-transform duration-500 ease-out ${mirrored ? "-scale-x-100" : ""}`}
      />

      {/* Re-keyed on every change, so the overlay draws itself in again. */}
      <svg key={key} viewBox={`0 0 ${pose.w} ${pose.h}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        {landmarks.map(([x, y], i) => (
          <path
            key={i}
            d={`M ${x} ${y} h 0`}
            stroke="#FFFFFF"
            strokeOpacity={0.75}
            strokeWidth={5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="animate-[fade-in_400ms_ease-out_both]"
            style={{ animationDelay: `${i * 18}ms` }}
          />
        ))}
        {[OUTLINE, LINE].map((stroke, i) => (
          <path
            key={stroke}
            d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} L ${c[0]} ${c[1]}`}
            fill="none"
            stroke={stroke}
            strokeWidth={i === 0 ? 5.5 : 2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray={1}
            className="animate-[draw_700ms_ease-out_200ms_both]"
          />
        ))}
        {measured.reference && (
          <path
            d={`M ${b[0]} ${b[1]} L ${measured.reference[0]} ${measured.reference[1]}`}
            stroke="#FFFFFF"
            strokeOpacity={0.8}
            strokeWidth={1.5}
            strokeDasharray="5 5"
            vectorEffect="non-scaling-stroke"
            className="animate-[fade-in_400ms_ease-out_400ms_both]"
          />
        )}
        <path
          d={arc}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          strokeDasharray={1}
          className="animate-[draw_700ms_ease-out_500ms_both]"
        />
        {points.map(([x, y], i) => (
          <path
            key={i}
            d={`M ${x} ${y} h 0`}
            stroke={i === 1 ? "#FFFFFF" : LINE}
            strokeWidth={i === 1 ? 11 : 8}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div
        key={`label-${key}`}
        className="absolute animate-[fade-in_400ms_ease-out_500ms_both] whitespace-nowrap rounded-lg border border-[#5ED6C6]/70 bg-[rgba(10,14,15,.82)] px-2.5 py-1 text-[13px] font-medium text-white"
        style={label}
      >
        {angleLabel} <span className="tabular-nums">{degrees}°</span>
      </div>

      <Viewfinder />
      <figcaption className="absolute bottom-[13px] left-[42px] text-xs leading-none text-white/80">{landmarks.length} points tracked</figcaption>
    </figure>
  );
}

/** Thin camera corner marks. */
function Viewfinder() {
  const corner = "absolute h-5 w-5 border-white/65";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-3">
      <span className={`${corner} left-0 top-0 rounded-tl-md border-l-[1.5px] border-t-[1.5px]`} />
      <span className={`${corner} right-0 top-0 rounded-tr-md border-r-[1.5px] border-t-[1.5px]`} />
      <span className={`${corner} bottom-0 left-0 rounded-bl-md border-b-[1.5px] border-l-[1.5px]`} />
      <span className={`${corner} bottom-0 right-0 rounded-br-md border-b-[1.5px] border-r-[1.5px]`} />
    </div>
  );
}
