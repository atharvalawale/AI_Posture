"use client";

import { useClipReps } from "@/components/pose/usePoseClip";
import { formScore, type Rep } from "@/lib/pose";
import type { SamplePatient } from "@/lib/sample";

/** Each rep's angle for this patient: Maya's deepest knee bends from the squat clip, the others' from the sample data. Null while the clip loads. */
function repsOf(patient: SamplePatient, clipReps: Rep[] | null): number[] | null {
  return patient.measure.values ?? clipReps?.map((r) => r.depth) ?? null;
}

/** Each rep's angle for this patient. Null while Maya's clip loads. */
export function usePatientReps(patient: SamplePatient): number[] | null {
  return repsOf(patient, useClipReps());
}

/** Scores any patient's reps against the physio's starting target for them. A score is null while Maya's clip loads. */
export function useFormScores(): (patient: SamplePatient) => number | null {
  const clipReps = useClipReps();
  return (patient) => {
    const values = repsOf(patient, clipReps);
    return values ? formScore(values, patient.measure.target, patient.measure.direction) : null;
  };
}
