"use client";

import { useState } from "react";
import { useClipReps, usePoseClip } from "@/components/pose/usePoseClip";
import { LiveSession, clipDuration } from "@/lib/pose";
import { PATIENTS, type SamplePatient } from "@/lib/sample";
import { PatientDetail } from "./PatientDetail";
import { PatientList } from "./PatientList";
import { SessionReplay } from "./SessionReplay";

/** Maya's knee bend target when the page opens, in degrees. */
const START_TARGET = 100;

/**
 * A physio dashboard with sample patients, in one product window. Maya's session replays from the real squat
 * clip: her rep bars, form score and flags are computed from it, follow the target slider, and loop a rep on click.
 */
export function PhysioDashboard({ className = "" }: { className?: string }) {
  const [session] = useState(() => new LiveSession());
  const clip = usePoseClip();
  const reps = useClipReps();
  const [selected, setSelected] = useState<SamplePatient["id"]>("maya");
  const [target, setTarget] = useState(START_TARGET);
  const [activeRep, setActiveRep] = useState<number | null>(null);
  const patient = PATIENTS.find((p) => p.id === selected) ?? PATIENTS[0];
  const depths = reps?.map((r) => r.depth) ?? null;

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
          className="aspect-[3/4] sm:aspect-auto lg:min-h-[520px]"
        />
        <PatientDetail
          patient={patient}
          depths={depths}
          target={target}
          onTarget={setTarget}
          activeRep={activeRep}
          onRep={playRep}
          className="p-5 sm:p-6"
        />
      </div>
    </div>
  );
}
