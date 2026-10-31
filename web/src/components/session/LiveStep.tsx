"use client";

import { type RefObject, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { type Exercise, type Facing, MAX_RETRIES, scoreBand, type Side } from "@/lib/session/protocol";
import type { Connection, Cue } from "@/lib/session/reducer";
import type { PoseFeed } from "@/lib/session/skeleton";
import { CameraFrame, CloseButton, Sheet, SwitchCameraButton, TopBar } from "./CameraFrame";
import { LiveSkeleton } from "./LiveSkeleton";
import { bandFill, bandFillOnDark } from "./scoreColors";

type Props = {
  exercise: Exercise;
  side: Side;
  repsTarget: number;
  connection: Connection;
  cue: Cue | null;
  repCount: number;
  angle: number | null;
  holdProgress: number;
  scores: number[];
  avgScore: number | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  /** The latest pose from the server, drawn as a skeleton over the video. */
  pose: PoseFeed;
  stream: MediaStream | null;
  facing: Facing;
  onSwitchCamera: () => void;
  onStop: () => void;
  onRetry: () => void;
  onBack: () => void;
};

type Message = { title: string; detail: string | null; tone: "plain" | "warning" | "error" };

function message(connection: Connection, cue: Cue | null): Message {
  switch (connection.status) {
    case "idle":
    case "connecting":
      return { title: "Connecting to the AI", detail: null, tone: "plain" };
    case "retrying":
      return connection.reconnect
        ? { title: `Reconnecting to the AI, attempt ${connection.attempt} of ${MAX_RETRIES}`, detail: "The connection dropped. Hold on.", tone: "plain" }
        : {
            title: `Waking up the AI, attempt ${connection.attempt} of ${MAX_RETRIES}`,
            detail: "The AI sleeps when nobody is using it. Waking it up can take up to a minute.",
            tone: "plain",
          };
    case "failed":
      return { title: "We could not reach the AI", detail: "It may still be waking up or busy. Wait a minute, then try again.", tone: "error" };
    case "live": {
      const tone = cue?.severity === "error" ? "error" : cue?.severity === "warning" ? "warning" : "plain";
      return { title: cue?.text || "Get into your starting position.", detail: null, tone };
    }
  }
}

const toneOnDark = { plain: "text-[#eef2f1]", warning: "text-[#f2cb7e]", error: "text-[#f5a39a]" };
const toneOnPage = { plain: "text-text", warning: "text-[#9a6412] dark:text-[#e8b04b]", error: "text-[#b23b2f] dark:text-[#f08a7e]" };

export function LiveStep(props: Props) {
  const { exercise, side, repsTarget, connection, cue, repCount, angle, holdProgress, scores, avgScore } = props;
  const msg = message(connection, cue);
  const failed = connection.status === "failed";
  const angleText = angle === null ? "--" : `${Math.round(angle)}°`;
  const last = scores.length ? Math.round(scores[scores.length - 1]) : null;
  const sideText = `${side === "left" ? "Left" : "Right"} side`;

  return (
    <CameraFrame
      videoRef={props.videoRef}
      stream={props.stream}
      facing={props.facing}
      label="Live session"
      overlay={
        <>
          <LiveSkeleton videoRef={props.videoRef} feed={props.pose} mirrored={props.facing === "user"} />
          <TopBar>
            <div className="flex gap-2">
              <CloseButton label="End session" onClick={props.onStop} className="lg:hidden" />
              <SwitchCameraButton onClick={props.onSwitchCamera} />
            </div>
            <RepCounter count={repCount} target={repsTarget} />
          </TopBar>
          <Sheet>
            <p className={`min-h-6 text-[19px] font-semibold leading-tight ${toneOnDark[msg.tone]}`} aria-live="polite">
              {msg.title}
            </p>
            {msg.detail && <p className="mt-1.5 text-[14px] leading-snug text-[#a9b6b4]">{msg.detail}</p>}
            {failed ? (
              <FailedActions onRetry={props.onRetry} onBack={props.onBack} onDark />
            ) : (
              <>
                <div className="mt-2.5 flex justify-between gap-3 text-[13px] text-[#a9b6b4]">
                  <span className="truncate">{last === null ? `${exercise.name}, ${sideText.toLowerCase()}` : `Last rep ${last}`}</span>
                  <span className="shrink-0">
                    {exercise.angleLabel} <b className="font-semibold text-white tabular-nums">{angleText}</b>
                  </span>
                </div>
                <RepSegments scores={scores} target={repsTarget} hold={holdProgress} onDark className="mt-3" />
              </>
            )}
          </Sheet>
        </>
      }
      panel={
        <>
          <p className="text-[15px] text-muted">
            {sideText}, {repsTarget} reps
          </p>
          <h1 className="mt-2 font-serif text-[44px] font-normal leading-[1.08] tracking-[-0.02em]">{exercise.name}</h1>
          <div className="mt-8 min-h-[7.5rem] border-t border-line pt-6">
            <p className={`text-[22px] font-medium leading-snug ${toneOnPage[msg.tone]}`} aria-live="polite">
              {msg.title}
            </p>
            {msg.detail && <p className="mt-2 text-[15px] leading-relaxed text-muted">{msg.detail}</p>}
          </div>
          {failed ? (
            <FailedActions onRetry={props.onRetry} onBack={props.onBack} />
          ) : (
            <>
              <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-6">
                <Stat label="Last rep" value={last === null ? "--" : String(last)} />
                <Stat label="Average" value={avgScore === null ? "--" : String(Math.round(avgScore))} />
                <Stat label={exercise.angleLabel} value={angleText} />
              </dl>
              <div className="mt-6 border-t border-line pt-6">
                <div className="flex justify-between text-[15px]">
                  <span className="text-muted">Reps</span>
                  <span className="tabular-nums">
                    {repCount} of {repsTarget}
                  </span>
                </div>
                <RepSegments scores={scores} target={repsTarget} hold={holdProgress} className="mt-3" />
              </div>
              <Button variant="line" className="mt-10 self-start" onClick={props.onStop}>
                End session
              </Button>
            </>
          )}
        </>
      }
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-[28px] font-medium leading-none tabular-nums">{value}</dd>
    </div>
  );
}

function RepCounter({ count, target }: { count: number; target: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef(count);

  // A short accent flash on each new rep, like the old page.
  useEffect(() => {
    if (count > previous.current) {
      ref.current?.animate?.([{ backgroundColor: "rgba(111,208,195,0.85)" }, { backgroundColor: "rgba(10,14,15,0.72)" }], {
        duration: 600,
        easing: "ease-out",
      });
    }
    previous.current = count;
  }, [count]);

  return (
    <div ref={ref} className="rounded-2xl bg-[rgba(10,14,15,0.72)] px-3.5 py-2 text-center text-white" aria-label={`${count} of ${target} reps`} role="status">
      <b className="block text-[30px] font-semibold leading-none tabular-nums">{count}</b>
      <span className="mt-0.5 block text-xs text-[#b7c2c0]">of {target}</span>
    </div>
  );
}

/** One segment per target rep. Done reps take their score color; the current one fills while you hold. */
function RepSegments({ scores, target, hold, onDark = false, className = "" }: { scores: number[]; target: number; hold: number; onDark?: boolean; className?: string }) {
  const track = onDark ? "bg-white/15" : "bg-line";
  const fills = onDark ? bandFillOnDark : bandFill;
  const holding = onDark ? "bg-[#6fd0c3]" : "bg-accent";
  return (
    <div className={`flex gap-1 ${className}`} aria-hidden="true">
      {Array.from({ length: target }, (_, i) => {
        const score = scores[i];
        const current = i === scores.length;
        return (
          <span key={i} className={`relative h-[5px] flex-1 overflow-hidden rounded-full ${track}`}>
            {score !== undefined ? (
              <span className={`absolute inset-0 ${fills[scoreBand(score)]}`} />
            ) : current && hold > 0 ? (
              <span className={`absolute inset-y-0 left-0 opacity-60 transition-[width] duration-200 ${holding}`} style={{ width: `${Math.min(1, hold) * 100}%` }} />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

function FailedActions({ onRetry, onBack, onDark = false }: { onRetry: () => void; onBack: () => void; onDark?: boolean }) {
  if (onDark) {
    return (
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onRetry} className="h-11 flex-1 rounded-[10px] bg-[#6fd0c3] text-[15px] font-medium text-[#06231f]">
          Try again
        </button>
        <button type="button" onClick={onBack} className="h-11 flex-1 rounded-[10px] border border-white/25 text-[15px] font-medium text-white">
          Back
        </button>
      </div>
    );
  }
  return (
    <div className="mt-8 flex gap-3">
      <Button onClick={onRetry}>Try again</Button>
      <Button variant="line" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
