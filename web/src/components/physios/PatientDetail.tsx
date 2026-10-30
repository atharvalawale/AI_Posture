"use client";

import { RepBars } from "@/components/product/RepBars";
import { TargetSlider } from "@/components/product/TargetSlider";
import { formScore, reachedCount } from "@/lib/pose";
import type { SamplePatient } from "@/lib/sample";

type Flag = { text: string; note: string; ok?: boolean; rep?: number };

type Props = {
  patient: SamplePatient;
  /** Deepest knee bend per rep of Maya's clip, or null while it loads. */
  depths: number[] | null;
  target: number;
  onTarget: (v: number) => void;
  activeRep: number | null;
  onRep: (i: number | null) => void;
  className?: string;
};

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Maya's flags come from her reps against the target: one per short rep, or one saying every rep reached it. */
function flagsFor(patient: SamplePatient, depths: number[] | null, target: number): Flag[] {
  if (patient.form !== "clip") return patient.flags;
  if (!depths) return patient.flags;
  const short: Flag[] = depths.flatMap((d, i) =>
    Math.round(d) > target ? [{ text: `Rep ${i + 1} stopped short of your target`, note: `${Math.round(d)}°`, rep: i }] : [],
  );
  return [...(short.length ? short : [{ text: "Every rep reached your target", note: `${target}°`, ok: true }]), ...patient.flags];
}

/** Name and week, the three numbers a physio checks first, the reps against the target, and what is worth a look. */
export function PatientDetail({ patient, depths, target, onTarget, activeRep, onRep, className = "" }: Props) {
  const fromClip = patient.form === "clip";
  const form = fromClip ? (depths ? formScore(depths, target) : null) : patient.form;
  const first = patient.name.split(" ")[0];
  const flags = flagsFor(patient, depths, target);

  return (
    <div className={`grid content-start gap-6 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-serif text-[26px] leading-tight tracking-[-0.01em] text-text">{patient.name}</p>
        <p className="text-[15px] text-muted">
          {patient.condition}, week {patient.week}
        </p>
      </div>

      <dl className="grid grid-cols-3 border-y border-line">
        {[
          ["Form score", form === null ? "--" : String(form)],
          ["This week", patient.sessions],
          ["Pain", patient.pain],
        ].map(([label, value], i) => (
          <div key={label} className={`min-w-0 py-3 ${i ? "border-l border-line pl-4" : ""}`}>
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="mt-0.5 text-[24px] leading-tight font-medium tabular-nums text-text">{value}</dd>
          </div>
        ))}
      </dl>

      {/* The rep bars and target describe Maya's squat clip. For the others they rest, dimmed and out of reach. */}
      <div inert={!fromClip} className={`grid gap-6 transition-opacity ${fromClip ? "" : "opacity-35"}`}>
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-[15px] text-muted">Deepest knee bend per rep</p>
            {depths && (
              <p aria-live="polite" className="text-[15px] font-semibold tabular-nums text-text">
                {reachedCount(depths, target)} of {depths.length} reached your target
              </p>
            )}
          </div>
          <div className="mt-4">
            <RepBars depths={depths} target={target} activeRep={activeRep} onRep={(i) => onRep(activeRep === i ? null : i)} height="h-40" />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[15px] text-muted">{activeRep === null ? "Pick a rep to replay it." : `Replaying rep ${activeRep + 1}.`}</p>
            <button
              type="button"
              aria-pressed={activeRep === null}
              onClick={() => onRep(null)}
              className={`h-11 shrink-0 cursor-pointer rounded-lg border px-3.5 text-[15px] text-text transition-colors ${focus} ${
                activeRep === null ? "border-transparent bg-surface-2" : "border-line hover:bg-surface-2"
              }`}
            >
              Play all
            </button>
          </div>
        </div>

        <div>
          <TargetSlider label={`Your target for ${first}`} value={target} onChange={onTarget} />
          <p className="mt-1 text-[13px] text-pretty text-muted">
            Change it here and {first}&apos;s phone shows the new target at the next session.
          </p>
        </div>
      </div>

      <div>
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
                {f.rep !== undefined ? (
                  <button
                    type="button"
                    aria-pressed={activeRep === f.rep}
                    onClick={() => onRep(f.rep!)}
                    className={`${row} cursor-pointer transition-colors hover:bg-line/70 ${focus}`}
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
