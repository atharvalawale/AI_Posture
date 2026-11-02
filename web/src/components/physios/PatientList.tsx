import Image from "next/image";
import type { ReactNode } from "react";
import { weekCount, type DayMark, type SamplePatient } from "@/lib/sample";

export const DAY_COLOR: Record<DayMark, string> = { done: "bg-accent", missed: "bg-warn" };

/** The patient's face from their footage, or their initials when there is none. */
export function Avatar({ avatar, initials, className = "size-10" }: { avatar?: string; initials: string; className?: string }) {
  if (avatar) {
    return <Image src={avatar} alt="" width={44} height={44} unoptimized className={`${className} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span
      aria-hidden
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-semibold text-muted`}
    >
      {initials}
    </span>
  );
}

/** This week, Monday first: done in accent, missed in warn. Today, done this morning, is the last day. */
export function DaysStrip({ days, className = "" }: { days: DayMark[]; className?: string }) {
  const { done, missed } = weekCount(days);
  return (
    <span role="img" aria-label={`This week: ${done} done, ${missed} missed`} className={`flex gap-[3px] ${className}`}>
      {days.map((d, i) => (
        <span key={i} className={`block h-1 w-2.5 rounded-full sm:w-3 ${DAY_COLOR[d]}`} />
      ))}
    </span>
  );
}

type Props = {
  patients: SamplePatient[];
  selected: SamplePatient["id"];
  onSelect: (id: SamplePatient["id"]) => void;
  /** Shown under the list from 1024 px, where the list is a column as tall as the replay. */
  footer?: ReactNode;
  className?: string;
};

/**
 * The physio's patients. A row of faces and first names on phones, three entries on tablets, a column on desktop.
 * Each entry names the patient and their exercise, with this week's sessions.
 */
export function PatientList({ patients, selected, onSelect, footer, className = "" }: Props) {
  return (
    <div className={className}>
      <p className="px-2 pb-2 text-[13px] text-muted lg:pb-3">Your patients today</p>
      <ul className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:grid-cols-1 lg:gap-1">
        {patients.map((p) => {
          const on = p.id === selected;
          return (
            <li key={p.id} className="min-w-0">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(p.id)}
                className={`flex min-h-11 w-full cursor-pointer flex-col items-center gap-2 rounded-xl px-1.5 py-2.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-row sm:gap-3 sm:px-2.5 sm:text-left ${
                  on ? "bg-surface-2" : "hover:bg-surface-2/60"
                }`}
              >
                <Avatar avatar={p.avatar} initials={p.initials} />
                <span className="flex min-w-0 flex-col items-center sm:items-start">
                  <span aria-hidden className="text-[15px] font-semibold text-text sm:hidden">
                    {p.name.split(" ")[0]}
                  </span>
                  <span className="sr-only sm:not-sr-only sm:block sm:truncate sm:text-[15px] sm:font-semibold sm:text-text">{p.name}</span>
                  <span className="sr-only sm:not-sr-only sm:block sm:truncate sm:text-[13px] sm:text-muted">{p.exercise}</span>
                  <DaysStrip days={p.days} className="mt-1.5" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {footer && <div className="hidden lg:block">{footer}</div>}
    </div>
  );
}

/** A patient worth a look, by first name, and what needs the look. */
export type QueueItem = { id: SamplePatient["id"]; name: string; text: string };

/**
 * The physio's morning at a glance: how many of today's sessions are in, and the patients flagged today,
 * each with the first thing that needs it. A summary only: the patient list above is where you pick a patient.
 */
export function MorningQueue({ done, total, items }: { done: number; total: number; items: QueueItem[] }) {
  return (
    <div className="mt-5 border-t border-line px-2 pt-4">
      <p className="text-[13px] text-muted">This morning</p>
      <p className="mt-0.5 font-serif text-[22px] leading-tight text-text">
        {done} of {total} sessions in
      </p>
      {items.length > 0 && (
        <>
          <p className="mt-5 text-[13px] text-muted">Flagged today</p>
          <ul className="mt-2 grid gap-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-2.5">
                <span aria-hidden className="mt-[7px] size-2 shrink-0 rounded-full bg-warn" />
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-text">{item.name}</span>
                  <span className="block text-[13px] text-pretty text-muted">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
