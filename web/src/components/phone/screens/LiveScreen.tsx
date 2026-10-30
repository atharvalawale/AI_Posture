"use client";

import { useRef } from "react";
import { MEASURES, type LiveSession } from "@/lib/pose";
import { usePoseVideo } from "../usePoseVideo";

// Overlay colors sit on top of video, so they stay the same in both themes (like the skeleton).
const OVERLAY = "bg-[rgba(10,14,15,.72)]";

/**
 * The live session: the squat clip with real pose tracking, rep count and spoken cue.
 * The skeleton and the bottom card follow `session`'s selected joint. Without a session it keeps its own.
 */
export function LiveScreen({ active = true, session }: { active?: boolean; session?: LiveSession }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { joint, value, reps, cue, playing } = usePoseVideo(videoRef, canvasRef, { active, session });

  return (
    // The poster is also the background, so the screen still shows the squat where the video is hidden (without JavaScript).
    <div
      className="absolute inset-0 bg-[#1c2224] bg-cover bg-center text-[#EEF2F1]"
      style={{ backgroundImage: "url(/media/squat-poster.jpg)" }}
      data-playing={playing}
    >
      <video
        ref={videoRef}
        data-pose-video
        className="absolute inset-0 h-full w-full object-cover"
        src="/media/squat-720.mp4"
        poster="/media/squat-poster.jpg"
        muted
        loop
        playsInline
        // Nothing loads for a screen that is not on show (How it works Practice before its tab opens), so a page
        // loads the clip once for the phone in view.
        preload={active ? "auto" : "none"}
        aria-hidden="true"
        tabIndex={-1}
        disablePictureInPicture
      />
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />

      <div className="absolute left-4 right-4 top-[46px] flex items-start justify-between">
        <div aria-hidden="true" className={`flex h-[34px] w-[34px] items-center justify-center rounded-full ${OVERLAY}`}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M7 7l10 10M17 7L7 17" />
          </svg>
        </div>
        <div className={`min-w-[58px] rounded-2xl px-3.5 pb-2 pt-2.5 text-center ${OVERLAY}`}>
          <p className="text-[30px] font-semibold leading-none tabular-nums">{reps}</p>
          <p className="mt-1 text-[13px] text-[#B7C2C0]">of 10</p>
        </div>
      </div>

      <div className="absolute inset-x-2.5 bottom-2.5 rounded-[26px] bg-[rgba(10,14,15,.86)] px-[18px] pb-[18px] pt-4">
        <p className="min-h-6 text-[19px] font-semibold leading-tight">{cue}</p>
        <div className="mt-2.5 flex justify-between text-[13px] text-[#A9B6B4]">
          <span>Squat, set 1 of 3</span>
          <span className="font-semibold tabular-nums text-white">{`${MEASURES[joint].name} ${value === null ? "--" : `${value}°`}`}</span>
        </div>
        <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-white/[.12]">
          <div className="h-full rounded-full bg-[#6FD0C3] transition-[width] duration-400" style={{ width: `${reps * 10}%` }} />
        </div>
      </div>
    </div>
  );
}
