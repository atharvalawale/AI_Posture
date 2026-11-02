"use client";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { type Exercise, motivation, scoreBand, type ScoreBand, type Side, type Summary } from "@/lib/session/protocol";
import { site } from "@/lib/site";
import { bandFill, bandLabel } from "./scoreColors";

type Props = {
  exercise: Exercise;
  side: Side;
  repsTarget: number;
  summary: Summary;
  completed: boolean;
  onAgain: () => void;
};

export function ReportSheet({ exercise, side, repsTarget, summary, completed, onAgain }: Props) {
  const avg = Math.round(summary.avg_score);
  const note = motivation(avg);
  const scores = summary.scores;

  return (
    <Container className="max-w-[680px] py-14 md:py-20">
      <p className="text-[15px] text-muted">
        {exercise.name}, {side} side, {repsTarget} reps
      </p>
      <h1 className="mt-2 font-serif text-[40px] font-normal leading-[1.08] tracking-[-0.02em] md:text-[56px]">{completed ? "Session complete" : "Session ended"}</h1>

      <div className="mt-8 flex items-center gap-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <span className="text-[60px] font-medium leading-none tracking-[-0.02em] tabular-nums">{avg}</span>
        <div>
          <p className="text-[17px] font-medium">Average form score</p>
          <p className="mt-0.5 text-[15px] text-muted">Out of 100</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        <Stat label="Best rep" value={Math.round(summary.max_score)} />
        <Stat label="Lowest rep" value={Math.round(summary.min_score)} />
        <Stat label="Reps done" value={`${summary.reps_completed} of ${repsTarget}`} />
        <Stat label="Completion" value={`${Math.round(summary.completion_pct)}%`} />
      </dl>

      {scores.length > 0 && (
        <section aria-label="Score per rep" className="mt-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <h2 className="text-[17px] font-medium">Score per rep</h2>
          <div className="mt-5 flex h-[132px] items-end gap-1.5 sm:gap-2">
            {scores.map((score, i) => (
              <div key={i} className="flex h-full min-w-0 max-w-12 flex-1 flex-col items-center justify-end gap-1.5">
                <div
                  className={`w-full rounded-t-[4px] rounded-b-[2px] ${bandFill[scoreBand(score)]}`}
                  style={{ height: `${Math.max(4, Math.min(100, score)) * 1.04}px` }}
                  role="img"
                  aria-label={`Rep ${i + 1}: ${Math.round(score)}`}
                />
                <span className="text-xs leading-none text-muted tabular-nums">{Math.round(score)}</span>
              </div>
            ))}
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            {(["good", "ok", "low"] as ScoreBand[]).map((band) => (
              <li key={band} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-[3px] ${bandFill[band]}`} aria-hidden="true" />
                {bandLabel[band]}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4 rounded-2xl bg-surface-2 p-5 sm:p-6">
        <p className="text-[17px] font-medium">{note.title}</p>
        <p className="mt-1 text-[15px] leading-relaxed text-muted">{note.body}</p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onAgain}>Do another session</Button>
        <Button href="/" variant="line">
          Back to home
        </Button>
      </div>

      <p className="mt-8 border-t border-line pt-6 text-[15px] text-muted">This session ran in your browser. {site.appsComingSoon}</p>
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface p-4 sm:p-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1.5 text-[24px] font-medium leading-none tabular-nums">{value}</dd>
    </div>
  );
}
