"use client";

import { useEffect, useState } from "react";
import { findReps, loadPoseClip, type PoseClip, type Rep } from "@/lib/pose";

const repsByClip = new WeakMap<PoseClip, Rep[]>();

/** The squat clip, loaded once and shared, and whether loading it failed. */
export function usePoseClipStatus(): { clip: PoseClip | null; failed: boolean } {
  const [state, setState] = useState<{ clip: PoseClip | null; failed: boolean }>({ clip: null, failed: false });
  useEffect(() => {
    let live = true;
    loadPoseClip()
      .then((c) => live && setState({ clip: c, failed: false }))
      .catch(() => live && setState({ clip: null, failed: true }));
    return () => {
      live = false;
    };
  }, []);
  return state;
}

/** The squat clip, loaded once and shared. Null while loading or after a failure. */
export function usePoseClip(): PoseClip | null {
  return usePoseClipStatus().clip;
}

/** The reps found in the clip, computed once per clip. Null until the clip is ready. */
export function useClipReps(): Rep[] | null {
  const clip = usePoseClip();
  if (!clip) return null;
  let reps = repsByClip.get(clip);
  if (!reps) {
    reps = findReps(clip);
    repsByClip.set(clip, reps);
  }
  return reps;
}
