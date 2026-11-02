"use client";

import { RepBars } from "@/components/product/RepBars";
import { TargetSlider } from "@/components/product/TargetSlider";
import { formScore, reachedCount, shortReps } from "@/lib/pose";
import type { SamplePatient } from "@/lib/sample";

type Flag = { text: string; note: string; ok?: boolean; rep?: number };

type Props = {
  patient: SamplePatient;
  /** Each rep's angle for this patient, or null while Maya's clip loads. */
  values: number[] | null;
  target: number;
  onTarget: (v: number) => void;
  activeRep: number | null;
  /** Loops a rep in the replay, or plays it all with null. Only for a patient with footage. */
  onRep?: (i: number | null) => void;
  /** Maya's clip could not load, so her bars say so instead of waiting. */
  failed?: boolean;
  className?: string;
};

/** On phones each part sits in the dashboard's column, so it keeps the panel's side padding itself. */
const PHONE = "max-sm:mx-5";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** One flag per rep short of the target, or one saying every rep reached it, then the patient's other flags. */
export function flagsFor(patient: SamplePatient, values: number[] | null, target: number): Flag[] {
  if (!values) return patient.flags;
  const short: Flag[] = shortReps(values, target, patient.measure.direction).map(({ rep, value }) => ({
    text: `Rep ${rep + 1} stopped short of your target`,
    note: `${value}°`,
    rep,
  }));
  return [...(short.length ? short : [{ text: "Every rep reached your target", note: `${target}°`, ok: true }]), ...patient.flags];
}

/**
 * Name and week, the three numbers a physio checks first, the reps against the target, and what is worth a look.
 * On phones its parts join the dashboard's column (`contents`), with the rep chart first, right under the replay it plays.
 */
export function PatientDetail({ patient, values, target, onTarget, activeRep, onRep, failed = false, className = "" }: Props) {
  const { measure } = patient;
  const form = values ? formScore(values, target, measure.direction) : null;
  const first = patient.name.split(" ")[0];
  const flags = flagsFor(patient, values, target);
  const toggle = onRep && ((i: number) => onRep(activeRep === i ? null : i));

  return (
    <div data-patient-detail className={`grid content-start gap-6 max-sm:contents ${className}`}>
      {/* The condition always sits under the name, so a longer one never pushes the rest down for one patient only. */}
      <div className={`${PHONE} max-sm:order-2`}>
        <p className="font-serif text-[26px] leading-tight tracking-[-0.01em] text-text">{patient.name}</p>
        <p className="mt-1 text-[15px] text-muted">
          {patient.condition}, week {patient.week}
        </p>
      </div>

      {/* The values shrink a little with the panel, so "2 of 10" stays on one line on a 360 px phone. */}
      <dl className={`@container grid grid-cols-3 border-y border-line ${PHONE} max-sm:order-3`}>
        {[
          ["Form score", form === null ? "--" : String(form)],
          ["This week", patient.sessions],
          ["Pain", patient.pain],
        ].map(([label, value], i) => (
          <div key={label} className={`min-w-0 py-3 ${i ? "border-l border-line pl-4" : ""}`}>
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="mt-0.5 text-[length:min(24px,8cqi)] leading-tight font-medium whitespace-nowrap tabular-nums text-text">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Every patient gets the same rows here, so switching patients never moves what comes after. */}
      <div className={`${PHONE} max-sm:order-1`}>
        {/* Stacked, with room kept for the count while the clip loads, so every patient's rows line up. */}
        <div className="grid min-h-[50px] content-start gap-1">
          <p className="text-[15px] text-muted">{measure.label}</p>
          {values && (
            <p aria-live="polite" className="text-[15px] font-semibold tabular-nums text-text">
              {reachedCount(values, target, measure.direction)} of {values.length} reached your target
            </p>
          )}
        </div>
        <div className="mt-4">
          <RepBars
            depths={values}
            target={target}
            direction={measure.direction}
            range={measure.range}
            activeRep={activeRep}
            onRep={toggle}
            failed={failed}
            className="h-40"
          />
        </div>
        <div className="mt-3 flex min-h-11 items-center justify-between gap-3">
          {onRep ? (
            <>
              <p className="text-[15px] text-muted">{activeRep === null ? "Pick a rep to replay it." : `Replaying rep ${activeRep + 1}.`}</p>
              <button
                type="button"
                onClick={() => onRep(null)}
                className={`h-11 shrink-0 cursor-pointer rounded-lg border border-line px-3.5 text-[15px] text-text transition-colors hover:bg-surface-2 ${focus}`}
              >
                Play all
              </button>
            </>
          ) : (
            <p className="text-[15px] text-muted">Angles from this morning&apos;s session.</p>
          )}
        </div>
      </div>

      <div className={`${PHONE} max-sm:order-4`}>
        <TargetSlider label={`Your target for ${first}`} value={target} onChange={onTarget} min={measure.slider[0]} max={measure.slider[1]} />
        <p className="mt-1 text-[13px] text-pretty text-muted">
          Change it here and {first}&apos;s phone shows the new target at the next session.
        </p>
      </div>

      <div className={`${PHONE} max-sm:order-5`}>
        <p className="mb-2.5 text-[15px] text-muted">Worth a look</p>
        <ul className="grid gap-2">
          {flags.map((f) => {
            const body = (
              <>
                <span aria-hidden className={`size-2 shrink-0 rounded-full ${f.ok ? "bg-accent" : "bg-warn"}`} />
                <span className="min-w-0 flex-1 text-[15px] text-text">{f.text}</span>
                <span className="shrink-0 text-[13px] text-muted">{f.note}</span>
              </>
            );
            const row = "flex min-h-11 w-full items-center gap-3 rounded-xl bg-surface-2 px-3.5 py-2.5 text-left";
            return (
              <li key={f.text}>
                {toggle && f.rep !== undefined ? (
                  <button
                    type="button"
                    aria-pressed={activeRep === f.rep}
                    onClick={() => toggle(f.rep!)}
                    className={`${row} cursor-pointer transition-colors hover:bg-line/70 aria-pressed:bg-line/70 ${focus}`}
                  >
                    {body}
                  </button>
                ) : (
                  <div className={row}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
