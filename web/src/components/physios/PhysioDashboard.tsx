"use client";

import { useEffect, useState } from "react";
import { useClipRepsStatus, usePoseClip } from "@/components/pose/usePoseClip";
import { LiveSession, clipDuration } from "@/lib/pose";
import { MAYA, PATIENTS, TODAY, type SamplePatient } from "@/lib/sample";
import { PatientDetail, flagsFor } from "./PatientDetail";
import { MorningQueue, PatientList, type QueueItem } from "./PatientList";
import { SessionReplay } from "./SessionReplay";
import { repsOf, usePatientReps } from "./usePatientReps";

type Id = SamplePatient["id"];

/** Each patient's target when the page opens. The physio's changes are kept per patient. */
const START_TARGETS = Object.fromEntries(PATIENTS.map((p) => [p.id, p.measure.target])) as Record<Id, number>;

/**
 * A physio dashboard with sample patients, in one product window. Each patient's rep bars, form score and flags
 * come from their reps against the target slider. Maya's reps are computed from the real squat clip, and a click
 * on one loops it in her replay.
 */
export function PhysioDashboard({ className = "" }: { className?: string }) {
  const [session] = useState(() => new LiveSession(null, { poster: true }));
  useEffect(() => () => session.dispose(), [session]);
  const clip = usePoseClip();
  const { reps, failed } = useClipRepsStatus();
  const [selected, setSelected] = useState<Id>(MAYA.id);
  const [targets, setTargets] = useState(START_TARGETS);
  const [activeRep, setActiveRep] = useState<number | null>(null);
  const patient = PATIENTS.find((p) => p.id === selected) ?? MAYA;
  const values = usePatientReps(patient);
  // Only Maya has footage, so only her reps replay.
  const replayable = !patient.still;

  // What needs each patient's physio first, from the same flags as "Worth a look", at the targets set here:
  // a flag about their week, else their first rep short of the target.
  const queue: QueueItem[] = PATIENTS.flatMap((p) => {
    const flags = flagsFor(p, repsOf(p, reps), targets[p.id]).filter((f) => !f.ok);
    const flag = flags.find((f) => f.rep === undefined) ?? flags[0];
    if (!flag) return [];
    return [{ id: p.id, name: p.name.split(" ")[0], text: flag.rep === undefined ? flag.text : `Rep ${flag.rep + 1} stopped at ${flag.note}` }];
  });
  const inToday = PATIENTS.filter((p) => p.days[TODAY] === "done").length;

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
        footer={<MorningQueue done={inToday} total={PATIENTS.length} items={queue} />}
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
          failed={failed}
          className="p-5 sm:p-6"
        />
      </div>
    </div>
  );
}
