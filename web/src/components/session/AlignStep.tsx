"use client";

import { type RefObject, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Exercise, Facing } from "@/lib/session/protocol";
import { CameraFrame, CloseButton, Sheet, SwitchCameraButton, TopBar } from "./CameraFrame";

export const COUNTDOWN_SECONDS = 3;

type Props = {
  exercise: Exercise;
  videoRef: RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  facing: Facing;
  onSwitchCamera: () => void;
  onCancel: () => void;
  onDone: () => void;
};

/**
 * "Get into position": the camera preview, the exercise's setup instruction and an honest
 * 3 second countdown that starts once the camera is on. Nothing here pretends to detect the body.
 */
export function AlignStep({ exercise, videoRef, stream, facing, onSwitchCamera, onCancel, onDone }: Props) {
  const ready = stream !== null;
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [ready]);

  useEffect(() => {
    if (remaining === 0) onDone();
  }, [remaining, onDone]);

  const status = ready ? `Starting in ${Math.max(1, remaining)}` : "Opening your camera";

  return (
    <CameraFrame
      videoRef={videoRef}
      stream={stream}
      facing={facing}
      label="Get into position"
      overlay={
        <>
          <TopBar>
            <CloseButton label="Cancel" onClick={onCancel} className="lg:hidden" />
            <SwitchCameraButton onClick={onSwitchCamera} className="lg:ml-auto" />
          </TopBar>
          <Sheet>
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[19px] font-semibold leading-tight">Get into position</p>
                <p className="mt-1.5 text-[15px] leading-snug text-[#a9b6b4]">{exercise.instruction}</p>
              </div>
              <Countdown ready={ready} remaining={remaining} className="text-[40px] text-[#6fd0c3]" />
            </div>
            <p className="mt-3 text-[13px] text-[#a9b6b4]" aria-live="polite">
              {status}
            </p>
          </Sheet>
        </>
      }
      panel={
        <>
          <p className="text-[15px] text-muted">{exercise.name}</p>
          <h1 className="mt-2 font-serif text-[44px] font-normal leading-[1.08] tracking-[-0.02em]">Get into position</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">{exercise.instruction}</p>
          <div className="mt-10 flex items-baseline gap-4 border-t border-line pt-6">
            <Countdown ready={ready} remaining={remaining} className="text-[64px] text-accent" />
            <p className="text-[15px] text-muted" aria-live="polite">
              {status}
            </p>
          </div>
          <Button variant="line" className="mt-10 self-start" onClick={onCancel}>
            Cancel
          </Button>
        </>
      }
    />
  );
}

function Countdown({ ready, remaining, className }: { ready: boolean; remaining: number; className: string }) {
  return (
    <span aria-hidden="true" className={`w-[1ch] text-center font-medium leading-none tabular-nums ${ready ? "" : "opacity-30"} ${className}`}>
      {Math.max(1, remaining)}
    </span>
  );
}
