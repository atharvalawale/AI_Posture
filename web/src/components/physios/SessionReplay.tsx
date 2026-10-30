"use client";

import Image from "next/image";
import { useRef } from "react";
import { usePoseVideo } from "@/components/phone/usePoseVideo";
import type { LiveSession, Rep } from "@/lib/pose";
import type { SamplePatient } from "@/lib/sample";

// Overlays sit on top of footage, so they keep fixed colors in both themes, like the skeleton.
const OVERLAY = "bg-[rgba(10,14,15,.62)] text-white backdrop-blur-sm";
const BONE = "bg-[#6fd0c3]";
/** Where the squat footage is anchored when cropped, as fractions. Keeps Maya's feet in frame. */
const FOOTAGE_POSITION: [number, number] = [0.42, 0.9];

type Props = {
  patient: SamplePatient;
  session: LiveSession;
  reps: Rep[] | null;
  /** Length of the pose clip in seconds, once it has loaded. */
  duration: number | null;
  activeRep: number | null;
  className?: string;
};

/**
 * The patient's latest session. For Maya, the squat footage with her tracked skeleton, the live knee angle
 * and a timeline marking the bottom of each rep. For the others, the photo of their exercise.
 */
export function SessionReplay({ patient, session, reps, duration, activeRep, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const footage = !patient.still;
  const { t, knee } = usePoseVideo(videoRef, canvasRef, { active: footage, session, position: FOOTAGE_POSITION });
  const at = (s: number) => `${duration ? Math.min(100, Math.max(0, (s / duration) * 100)) : 0}%`;
  const looped = activeRep !== null ? reps?.[activeRep] : undefined;

  return (
    <div className={`relative overflow-hidden bg-[#111] ${className}`}>
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover ${footage ? "" : "invisible"}`}
        style={{ objectPosition: `${FOOTAGE_POSITION[0] * 100}% ${FOOTAGE_POSITION[1] * 100}%` }}
        src="/media/squat-720.mp4"
        poster="/media/squat-poster.jpg"
        muted
        loop
        playsInline
        preload={footage ? "auto" : "metadata"}
        aria-hidden="true"
        tabIndex={-1}
        disablePictureInPicture
      />
      <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${footage ? "" : "invisible"}`} />

      {patient.still && (
        <Image
          key={patient.id}
          src={patient.still}
          alt={`${patient.name} doing ${patient.exercise.toLowerCase()}`}
          fill
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 100vw"
          // Landscape photos in a portrait frame: shown whole, like a landscape clip in a player, so the exercise stays readable.
          className="object-contain"
        />
      )}

      {/* Over a photo the label sits low, clear of the patient's face. Over footage the timeline takes the bottom. */}
      <p className={`absolute left-3 rounded-lg px-2.5 py-1.5 text-[13px] ${OVERLAY} ${footage ? "top-3" : "bottom-3"}`}>
        {footage ? "Session replay, this morning" : `${patient.exercise}, this morning`}
      </p>

      {footage && (
        <>
          <p className={`absolute top-3 right-3 rounded-xl px-3 py-2 text-right ${OVERLAY}`}>
            <span className="block text-[26px] leading-none font-medium tabular-nums">{knee === null ? "--" : `${knee}°`}</span>
            <span className="mt-1 block text-[13px] text-white/80">Knee</span>
          </p>
          <div aria-hidden="true" className="absolute right-3 bottom-4 left-3 h-[3px] rounded-full bg-white/25">
            {looped && <span className="absolute inset-y-0 rounded-full bg-white/35" style={{ left: at(looped.start), right: `calc(100% - ${at(looped.end)})` }} />}
            <span className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: at(t) }} />
            {reps?.map((rep, i) => (
              <span key={i} data-rep-mark className={`absolute -top-[3px] h-[9px] w-0.5 -translate-x-1/2 rounded-full ${BONE}`} style={{ left: at(rep.bottom) }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
