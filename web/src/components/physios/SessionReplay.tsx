"use client";

import Image from "next/image";
import { useRef } from "react";
import { usePoseVideo } from "@/components/phone/usePoseVideo";
import type { LiveSession, Rep } from "@/lib/pose";
import { TODAY, WEEKDAYS, type DayMark, type SamplePatient } from "@/lib/sample";
import { DAY_COLOR } from "./PatientList";

// Overlays sit on top of footage, so they keep fixed colors in both themes, like the skeleton.
const OVERLAY = "bg-[rgba(10,14,15,.62)] text-white backdrop-blur-sm";
const BONE = "bg-[#6fd0c3]";
/** Where the squat footage is anchored when cropped, as fractions. Keeps Maya's feet in frame. */
const FOOTAGE_POSITION: [number, number] = [0.42, 0.9];

const DAY_TEXT: Record<DayMark, string> = { done: "Done", missed: "Missed" };

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
 * The patient's week, a day per row: done or missed. Today is done this morning, and its dot is ringed.
 * Under the photo from 640 px. On phones the dashboard shows it at the foot of the details instead (`padding`).
 */
export function WeekList({ days, padding = "px-4 pt-3 pb-4 sm:px-5 sm:pt-4", className = "" }: { days: DayMark[]; padding?: string; className?: string }) {
  return (
    <div data-week-list className={`${padding} ${className}`}>
      <p className="text-[15px] text-muted">This week</p>
      <ul className="mt-1.5">
        {days.map((d, i) => (
          <li key={WEEKDAYS[i]} className="flex items-center justify-between gap-3 border-b border-line py-[7px] text-[15px] last:border-b-0">
            <span className="text-text">{WEEKDAYS[i]}</span>
            <span className="flex items-center gap-2 text-muted">
              <span aria-hidden className={`size-2 rounded-full ${DAY_COLOR[d]} ${i === TODAY ? "ring-2 ring-accent/30" : ""}`} />
              {i === TODAY && d === "done" ? "Done this morning" : DAY_TEXT[d]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The patient's latest session. For Maya, the squat footage with her tracked skeleton, the live knee angle
 * and a timeline marking the bottom of each rep. For the others, the photo of their exercise at its own
 * shape, with their week below it. On phones both take the same height.
 */
export function SessionReplay({ patient, session, reps, duration, activeRep, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const footage = !patient.still;
  const { t, knee } = usePoseVideo(videoRef, canvasRef, { active: footage, session, position: FOOTAGE_POSITION });
  const at = (s: number) => `${duration ? Math.min(100, Math.max(0, (s / duration) * 100)) : 0}%`;
  const looped = activeRep !== null ? reps?.[activeRep] : undefined;

  return (
    <div
      className={`relative overflow-hidden ${footage ? "bg-[#111] bg-cover" : "flex flex-col bg-surface-2"} ${className}`}
      // The poster is also the background, so the replay still shows Maya where the video is hidden (without JavaScript).
      style={footage ? { backgroundImage: "url(/media/squat-poster.webp)", backgroundPosition: `${FOOTAGE_POSITION[0] * 100}% ${FOOTAGE_POSITION[1] * 100}%` } : undefined}
    >
      {/* On phones the footage takes the same 4:3 as a photo, so the rep chart right under the replay stays put when the
          physio switches patients. From 640 px the replay stretches beside the details instead. */}
      {footage && <div aria-hidden="true" className="invisible aspect-[4/3] sm:hidden" />}
      {/* The video stays mounted while another patient shows, so switching back to Maya is instant. */}
      <video
        ref={videoRef}
        data-pose-video
        className={`absolute inset-0 h-full w-full object-cover ${footage ? "" : "invisible"}`}
        style={{ objectPosition: `${FOOTAGE_POSITION[0] * 100}% ${FOOTAGE_POSITION[1] * 100}%` }}
        src="/media/squat-720.mp4"
        poster="/media/squat-poster.webp"
        muted
        loop
        playsInline
        preload={footage ? "auto" : "metadata"}
        aria-hidden="true"
        tabIndex={-1}
        disablePictureInPicture
      />
      <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${footage ? "" : "invisible"}`} />

      {patient.still ? (
        <>
          <div className="relative aspect-[4/3] w-full shrink-0">
            <Image
              key={patient.id}
              src={patient.still}
              alt={`${patient.name} doing ${patient.exercise.toLowerCase()}`}
              fill
              sizes="(min-width: 1024px) 420px, (min-width: 640px) 45vw, 100vw"
              className="object-cover"
            />
            {/* Low on the photo, clear of the patient's face. */}
            <p className={`absolute bottom-3 left-3 rounded-lg px-2.5 py-1.5 text-[13px] ${OVERLAY}`}>{patient.exercise}, this morning</p>
          </div>
          <WeekList days={patient.days} className="max-sm:hidden" />
        </>
      ) : (
        <>
          <p className={`absolute top-3 left-3 rounded-lg px-2.5 py-1.5 text-[13px] ${OVERLAY}`}>Session replay, this morning</p>
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
