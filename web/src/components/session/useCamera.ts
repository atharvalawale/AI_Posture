"use client";

import { useEffect, useState } from "react";
import type { Facing } from "@/lib/session/protocol";

export type CameraProblem = "denied" | "no-camera" | "busy" | "unsupported" | "error";
export type CameraStatus = "idle" | "starting" | "ready" | CameraProblem;

const SIZE = { width: { ideal: 1280 }, height: { ideal: 720 } };

/** Back camera by default, with the same fallbacks as the old page. */
async function openStream(facing: Facing): Promise<MediaStream> {
  const media = navigator.mediaDevices;
  if (facing === "user") {
    return media.getUserMedia({ video: { ...SIZE, facingMode: "user" }, audio: false });
  }
  try {
    return await media.getUserMedia({ video: { ...SIZE, facingMode: { exact: "environment" } }, audio: false });
  } catch (error) {
    if (isPermissionError(error)) throw error;
    try {
      return await media.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    } catch (error2) {
      if (isPermissionError(error2)) throw error2;
      return media.getUserMedia({ video: true, audio: false });
    }
  }
}

function isPermissionError(error: unknown) {
  return error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
}

function classify(error: unknown): CameraProblem {
  if (!(error instanceof DOMException)) return "error";
  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "OverconstrainedError":
      return "no-camera";
    case "NotReadableError":
    case "AbortError":
      return "busy";
    default:
      return "error";
  }
}

function stop(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

type Result = { key: string; status: CameraStatus; stream: MediaStream | null };

/**
 * Opens the camera while `active` is true and stops every track as soon as it turns false, the
 * component unmounts, or the route is hidden (Activity runs effect cleanups on hide). Changing
 * `facing` or `run` reopens it.
 */
export function useCamera(active: boolean, facing: Facing, run: number): { status: CameraStatus; stream: MediaStream | null } {
  const key = `${facing}:${run}`;
  const [result, setResult] = useState<Result>({ key: "", status: "idle", stream: null });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let stream: MediaStream | null = null;

    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => !cancelled && setResult({ key, status: "unsupported", stream: null }));
    } else {
      openStream(facing).then(
        (s) => {
          if (cancelled) return stop(s);
          stream = s;
          // If the camera is unplugged or revoked mid-session, say so instead of freezing.
          s.getVideoTracks()[0]?.addEventListener("ended", () => {
            if (!cancelled) setResult({ key, status: "no-camera", stream: null });
          });
          setResult({ key, status: "ready", stream: s });
        },
        (error) => {
          if (!cancelled) setResult({ key, status: classify(error), stream: null });
        },
      );
    }

    return () => {
      cancelled = true;
      stop(stream);
      stream = null;
      // Forget the stopped stream so the next activation reports "starting", not a dead "ready".
      setResult({ key: "", status: "idle", stream: null });
    };
  }, [active, facing, key]);

  if (!active) return { status: "idle", stream: null };
  if (result.key !== key) return { status: "starting", stream: null };
  return { status: result.status, stream: result.stream };
}
