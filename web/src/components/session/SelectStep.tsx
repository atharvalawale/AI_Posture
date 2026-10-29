"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EXERCISES, type ExerciseKey, REPS_OPTIONS, type Side, SIDES } from "@/lib/session/protocol";
import { site } from "@/lib/site";
import { ExerciseIcon } from "./ExerciseIcon";

type Props = {
  exercise: ExerciseKey;
  side: Side;
  repsTarget: number;
  onChoose: (choice: { exercise?: ExerciseKey; side?: Side; repsTarget?: number }) => void;
  onStart: () => void;
};

const focusRing = "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent";

export function SelectStep({ exercise, side, repsTarget, onChoose, onStart }: Props) {
  return (
    <Container className="max-w-[760px] py-14 md:py-20">
      <h1 className="font-serif text-[40px] font-normal leading-[1.08] tracking-[-0.02em] md:text-[56px]">Choose your exercise</h1>
      <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-muted">
        Pick an exercise and set up your camera. FiixBE counts your reps and checks your form as you move.
      </p>

      <form
        className="mt-10"
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
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted transition-colors group-has-[:checked]:text-accent">
                  <ExerciseIcon exercise={ex.key} className="h-11 w-11" />
                </span>
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
      </form>

      <div className="mt-10 border-t border-line pt-6 text-[15px] leading-relaxed text-muted">
        <p>Uses your back camera when there is one. You can switch cameras during the session.</p>
        <p className="mt-2">This session runs in your browser. {site.appsComingSoon}</p>
      </div>
    </Container>
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
