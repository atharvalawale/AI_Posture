"use client";

import { useEffect, useState } from "react";
import { useClipReps, usePoseClip } from "@/components/pose/usePoseClip";
import { LiveSession, clipDuration } from "@/lib/pose";
import { MAYA, PATIENTS, type SamplePatient } from "@/lib/sample";
import { PatientDetail } from "./PatientDetail";
import { PatientList } from "./PatientList";
import { SessionReplay } from "./SessionReplay";
import { usePatientReps } from "./usePatientReps";

type Id = SamplePatient["id"];

/** Each patient's target when the page opens. The physio's changes are kept per patient. */
const START_TARGETS = Object.fromEntries(PATIENTS.map((p) => [p.id, p.measure.target])) as Record<Id, number>;

/**
 * A physio dashboard with sample patients, in one product window. Each patient's rep bars, form score and flags
 * come from their reps against the target slider. Maya's reps are computed from the real squat clip, and a click
 * on one loops it in her replay.
 */
export function PhysioDashboard({ className = "" }: { className?: string }) {
  const [session] = useState(() => new LiveSession());
  useEffect(() => () => session.dispose(), [session]);
  const clip = usePoseClip();
  const reps = useClipReps();
  const [selected, setSelected] = useState<Id>(MAYA.id);
  const [targets, setTargets] = useState(START_TARGETS);
  const [activeRep, setActiveRep] = useState<number | null>(null);
  const patient = PATIENTS.find((p) => p.id === selected) ?? MAYA;
  const values = usePatientReps(patient);
  // Only Maya has footage, so only her reps replay.
  const replayable = !patient.still;

  const playRep = (i: number | null) => {
    const rep = i === null ? undefined : reps?.[i];
    session.loop(rep ? [rep.start, rep.end] : null);
    setActiveRep(rep ? i : null);
  };

  return (
    <div
      role="region"
      aria-label="Sample physio dashboard"
      className={`overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_60px_-40px_rgb(0_0_0/0.35)] lg:grid lg:grid-cols-[228px_minmax(0,0.85fr)_minmax(0,1fr)] ${className}`}
    >
      <PatientList
        patients={PATIENTS}
        selected={selected}
        onSelect={setSelected}
        className="border-b border-line p-2.5 sm:p-3 lg:border-r lg:border-b-0"
      />
      <div className="sm:grid sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:contents">
        <SessionReplay
          patient={patient}
          session={session}
          reps={reps}
          duration={clip ? clipDuration(clip) : null}
          activeRep={activeRep}
          className="lg:min-h-[520px]"
        />
        <PatientDetail
          patient={patient}
          values={values}
          target={targets[patient.id]}
          onTarget={(v) => setTargets((t) => ({ ...t, [patient.id]: v }))}
          activeRep={replayable ? activeRep : null}
          onRep={replayable ? playRep : undefined}
          className="p-5 sm:p-6"
        />
      </div>
    </div>
  );
}
