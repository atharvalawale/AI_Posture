"use client";

import { type ReactNode, type RefObject, useEffect, useState } from "react";
import type { Facing } from "@/lib/session/protocol";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  facing: Facing;
  /** Drawn over the video: counter, buttons and, below lg, the dark sheet. */
  overlay: ReactNode;
  /** Shown beside the video from lg up. */
  panel: ReactNode;
  label: string;
};

/**
 * Full-screen camera on phones (a fixed layer over the site header), a centered framed view with a
 * side panel on desktop. The front camera preview is mirrored like a mirror. Frames sent to the
 * AI are always taken from the raw video, so they are never mirrored.
 */
export function CameraFrame({ videoRef, stream, facing, overlay, panel, label }: Props) {
  const [aspect, setAspect] = useState<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [stream, videoRef]);

  return (
    <section
      aria-label={label}
      className="fixed inset-0 z-50 flex overscroll-contain bg-black text-[#eef2f1] lg:static lg:z-auto lg:bg-transparent lg:text-text"
    >
      <div className="relative flex w-full lg:mx-auto lg:max-w-[1200px] lg:items-start lg:gap-12 lg:px-10 lg:py-12">
        <div
          className="relative h-full w-full overflow-hidden bg-black lg:h-auto lg:max-h-[calc(100dvh-10rem)] lg:min-w-0 lg:flex-1 lg:rounded-[28px]"
          style={{ aspectRatio: aspect ?? 4 / 3 }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight);
            }}
            className={`absolute inset-0 h-full w-full object-cover lg:object-contain ${facing === "user" ? "-scale-x-100" : ""}`}
          />
          {overlay}
        </div>
        <aside className="hidden lg:flex lg:w-[340px] lg:shrink-0 lg:flex-col">{panel}</aside>
      </div>
    </section>
  );
}

const overlayButton =
  "flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(10,14,15,0.6)] text-white transition-colors hover:bg-[rgba(10,14,15,0.8)]";

export function CloseButton({ label, onClick, className = "" }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`${overlayButton} ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

export function SwitchCameraButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button type="button" aria-label="Switch camera" title="Switch camera" onClick={onClick} className={`${overlayButton} ${className}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
        <path d="M9.2 12.2a3 3 0 0 1 5.3-1.4M14.8 13.8a3 3 0 0 1-5.3 1.4" />
        <path d="M14.8 9.2v1.8H13M9.2 16.8V15H11" />
      </svg>
    </button>
  );
}

/** The dark rounded sheet at the bottom of the phone view. Hidden from lg up, where the panel takes over. */
export function Sheet({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-x-2.5 bottom-[max(10px,env(safe-area-inset-bottom))] z-10 rounded-[26px] bg-[rgba(10,14,15,0.86)] px-[18px] pb-[18px] pt-4 text-[#eef2f1] lg:hidden">
      {children}
    </div>
  );
}

/** The top row over the camera. */
export function TopBar({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 px-4 pt-[max(16px,env(safe-area-inset-top))] lg:px-5 lg:pt-5">
      {children}
    </div>
  );
}
