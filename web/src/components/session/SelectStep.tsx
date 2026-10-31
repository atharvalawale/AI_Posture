"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { exerciseImage, exercisePose, squareCropX } from "@/lib/session/exercise-pose";
import { EXERCISES, getExercise, type ExerciseKey, REPS_OPTIONS, type Side, SIDES } from "@/lib/session/protocol";
import { site } from "@/lib/site";
import { ExercisePreview } from "./ExercisePreview";

type Props = {
  exercise: ExerciseKey;
  side: Side;
  repsTarget: number;
  onChoose: (choice: { exercise?: ExerciseKey; side?: Side; repsTarget?: number }) => void;
  onStart: () => void;
};

const focusRing = "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent";

/** "hip", "knee", "ankle" as "Hip, knee and ankle". */
function listJoints(joints: readonly string[]) {
  const text = `${joints.slice(0, -1).join(", ")} and ${joints.at(-1)}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function SelectStep({ exercise, side, repsTarget, onChoose, onStart }: Props) {
  const selected = getExercise(exercise);
  return (
    <Container className="grid gap-x-14 gap-y-10 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div>
        <h1 className="font-serif text-[40px] font-normal leading-[1.08] tracking-[-0.02em] md:text-[56px]">Choose your exercise</h1>
        <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-muted">
          Pick an exercise and set up your camera. FiixBE&apos;s AI counts your reps and checks your form as you move,
          free in your browser.
        </p>
      </div>

      <aside aria-label="How FiixBE tracks this exercise" className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <ExercisePreview exercise={exercise} side={side} />
        <dl className="mt-5 grid grid-cols-3 gap-4 border-b border-line pb-5">
          <Spec term="Measures" value={`${selected.angleLabel} angle`} />
          <Spec term="Tracks" value={listJoints(exercisePose(exercise).joints)} />
          <Spec term="Side" value={side === "left" ? "Left" : "Right"} />
        </dl>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{selected.instruction}</p>
      </aside>

      <form
        className="lg:col-start-1"
        onSubmit={(e) => {
          e.preventDefault();
          onStart();
        }}
      >
        <fieldset>
          <legend className="sr-only">Exercise</legend>
          <div className="flex flex-col gap-3">
            {EXERCISES.map((ex) => (
              <label
                key={ex.key}
                className={`group flex cursor-pointer items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-muted has-[:checked]:border-accent sm:gap-5 sm:p-5 ${focusRing}`}
              >
                <input
                  type="radio"
                  name="exercise"
                  value={ex.key}
                  checked={exercise === ex.key}
                  onChange={() => onChoose({ exercise: ex.key })}
                  className="sr-only"
                />
                <Image
                  src={exerciseImage(ex.key)}
                  alt=""
                  width={128}
                  height={128}
                  sizes="64px"
                  loading="eager"
                  style={{ objectPosition: `${squareCropX(ex.key)} 50%` }}
                  className="h-16 w-16 shrink-0 rounded-xl object-cover opacity-80 transition-opacity group-hover:opacity-100 group-has-[:checked]:opacity-100"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-medium">{ex.name}</span>
                  <span className="mt-1 block text-[15px] leading-snug text-muted">{ex.description}</span>
                </span>
                <RadioDot />
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Segmented legend="Side">
            {SIDES.map((s) => (
              <SegmentOption key={s} name="side" checked={side === s} onChange={() => onChoose({ side: s })}>
                {s === "left" ? "Left" : "Right"}
              </SegmentOption>
            ))}
          </Segmented>
          <Segmented legend="Reps">
            {REPS_OPTIONS.map((n) => (
              <SegmentOption key={n} name="reps" checked={repsTarget === n} onChange={() => onChoose({ repsTarget: n })}>
                {n}
              </SegmentOption>
            ))}
          </Segmented>
        </div>

        <Button type="submit" className="mt-10 w-full sm:w-auto sm:min-w-[180px]">
          Start
        </Button>

        <div className="mt-10 border-t border-line pt-6 text-[15px] leading-relaxed text-muted">
          <p>Uses your back camera when there is one. You can switch cameras during the session.</p>
          <p className="mt-2">This session runs in your browser. {site.appsComingSoon}</p>
        </div>
      </form>
    </Container>
  );
}

function Spec({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{term}</dt>
      <dd className="mt-1 text-[15px] font-medium leading-snug">{value}</dd>
    </div>
  );
}

function RadioDot() {
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line transition-colors group-has-[:checked]:border-accent"
    >
      <span className="h-2.5 w-2.5 scale-0 rounded-full bg-accent transition-transform group-has-[:checked]:scale-100" />
    </span>
  );
}

function Segmented({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-[15px] font-medium">{legend}</legend>
      <div className="flex gap-2">{children}</div>
    </fieldset>
  );
}

function SegmentOption({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label
      className={`flex h-12 flex-1 cursor-pointer items-center justify-center rounded-[10px] border border-line bg-surface text-[15px] text-muted transition-colors hover:border-muted has-[:checked]:border-accent has-[:checked]:text-text ${focusRing}`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}
