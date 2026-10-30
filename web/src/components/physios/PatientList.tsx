import Image from "next/image";
import type { DayMark, SamplePatient } from "@/lib/sample";

export const DAY_COLOR: Record<DayMark, string> = { done: "bg-accent", missed: "bg-warn", today: "bg-line" };

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

/** This week, Monday first: done in accent, missed in warn, today in line. */
export function DaysStrip({ days, className = "" }: { days: DayMark[]; className?: string }) {
  const done = days.filter((d) => d === "done").length;
  const missed = days.filter((d) => d === "missed").length;
  return (
    <span role="img" aria-label={`This week: ${done} done, ${missed} missed`} className={`flex gap-[3px] ${className}`}>
      {days.map((d, i) => (
        <span key={i} className={`block h-1 w-2.5 rounded-full sm:w-3 ${DAY_COLOR[d]}`} />
      ))}
    </span>
  );
}

type Props = { patients: SamplePatient[]; selected: SamplePatient["id"]; onSelect: (id: SamplePatient["id"]) => void; className?: string };

/**
 * The physio's patients. A row of faces and first names on phones, three entries on tablets, a column on desktop.
 * Each entry names the patient and their exercise, with this week's sessions.
 */
export function PatientList({ patients, selected, onSelect, className = "" }: Props) {
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
    </div>
  );
}
