"use client";

import { useEffect, useState } from "react";
import { findReps, loadPoseClip, type PoseClip, type Rep } from "@/lib/pose";

const repsByClip = new WeakMap<PoseClip, Rep[]>();

/** The squat clip, loaded once and shared. Null while loading or after a failure. */
export function usePoseClip(): PoseClip | null {
  const [clip, setClip] = useState<PoseClip | null>(null);
  useEffect(() => {
    let live = true;
    loadPoseClip()
      .then((c) => live && setClip(c))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return clip;
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
