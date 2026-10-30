"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useClipReps, usePoseClip } from "@/components/pose/usePoseClip";
import { shortReps, weekDepths } from "@/lib/pose";
import { KABIR, MAYA, MAYA_TARGET, PATIENTS, PLAN_ITEMS, type DayMark } from "@/lib/sample";
import { Avatar } from "./PatientList";
import { useFormScores } from "./usePatientReps";

// The visuals behind the For physios feature cards. All sample data, shown inside product views.

/**
 * The frame every feature and practice visual sits in. Fixed height, so switching panels never moves the page.
 * On phones each section's frames are sized to its tallest panel: the feature panels by default, the practice panels taller.
 */
export function PanelFrame({ id, phoneHeight = "h-[360px]", children }: { id: string; phoneHeight?: string; children: ReactNode }) {
  return (
    <div
      data-panel={id}
      className={`flex ${phoneHeight} items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface-2 p-3 sm:h-[440px] sm:p-8`}
    >
      {children}
    </div>
  );
}

export const cardClass = "rounded-xl border border-line bg-surface p-4 shadow-[0_16px_40px_-28px_rgb(0_0_0/0.4)]";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={`${cardClass} flex items-center justify-between gap-4`}>
      <span className="text-[15px] text-text">{label}</span>
      {children}
    </div>
  );
}

function Dot({ ok = false }: { ok?: boolean }) {
  return <span aria-hidden className={`mt-[7px] size-2 shrink-0 rounded-full ${ok ? "bg-accent" : "bg-warn"}`} />;
}

/** Maya's deepest knee bend this morning, and how much deeper it is than at her first session. Both from the squat clip. */
export function FormPanel() {
  const clip = usePoseClip();
  const reps = useClipReps();
  const deepest = reps?.length ? Math.round(Math.min(...reps.map((r) => r.depth))) : null;
  const firstSession = clip ? Math.round(weekDepths(clip)[0]) : null;
  return (
    <PanelFrame id="form">
      <div className="grid w-full max-w-[380px] gap-3">
        <Row label="Deepest knee bend">
          <span className="font-serif text-[44px] leading-none tabular-nums text-text">{deepest === null ? "--" : `${deepest}°`}</span>
        </Row>
        <Row label="Since her first session">
          <span className="text-[15px] font-semibold tabular-nums text-text">
            {deepest === null || firstSession === null ? "--" : `${firstSession - deepest}° deeper`}
          </span>
        </Row>
        <Row label="Smoothness">
          <span className="text-[15px] text-muted">Steady on the way down</span>
        </Row>
      </div>
    </PanelFrame>
  );
}

type DashEntry = { name: string; avatar?: string; initials: string; sessions: string; form: number | null };

function DashRow({ entry }: { entry: DashEntry }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_4rem_2rem] gap-2.5 sm:grid-cols-[minmax(0,1fr)_4.5rem_2.5rem] sm:gap-3 items-center border-b border-line py-2.5 last:border-b-0">
      <span className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <Avatar avatar={entry.avatar} initials={entry.initials} className="size-8 sm:size-9" />
        <span className="truncate text-[15px] font-medium text-text">{entry.name}</span>
      </span>
      <span className="text-[13px] text-muted tabular-nums">{entry.sessions}</span>
      <span className="text-right text-[15px] font-semibold tabular-nums text-text">{entry.form ?? "--"}</span>
    </li>
  );
}

function DashPanel() {
  const formOf = useFormScores();
  const entries: DashEntry[] = [...PATIENTS.map((p) => ({ ...p, form: formOf(p) })), KABIR];
  return (
    <PanelFrame id="dash">
      <div className={`${cardClass} w-full max-w-[400px] px-3 py-2 sm:px-4`}>
        <div className="grid grid-cols-[minmax(0,1fr)_4rem_2rem] gap-2.5 sm:grid-cols-[minmax(0,1fr)_4.5rem_2.5rem] sm:gap-3 border-b border-line py-2 text-[13px] text-muted">
          <span>Patient</span>
          <span>This week</span>
          <span className="text-right">Form</span>
        </div>
        <ul>
          {entries.map((e) => (
            <DashRow key={e.name} entry={e} />
          ))}
        </ul>
      </div>
    </PanelFrame>
  );
}

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const count = (days: DayMark[], mark: DayMark) => days.filter((d) => d === mark).length;

/** What reaches the physio first, from the same week and reps as the dashboard. */
export function AlertsPanel() {
  const reps = useClipReps();
  const short = reps ? shortReps(reps.map((r) => r.depth), MAYA_TARGET)[0] : undefined;
  const arjun = PATIENTS.find((p) => p.id === "arjun")!;
  const rohan = PATIENTS.find((p) => p.id === "rohan")!;
  const lastDone = arjun.days.lastIndexOf("done");
  const alerts: { title: string; note: string; ok?: boolean }[] = [
    { title: `Arjun missed ${count(arjun.days, "missed")} sessions`, note: `Last session on ${WEEKDAY_NAMES[lastDone]}` },
    !reps
      ? { title: "Maya finished this morning's session", note: "Loading her reps" }
      : short
        ? { title: `Maya's rep ${short.rep + 1} stopped at ${short.value}°`, note: `Your target is ${MAYA_TARGET}°` }
        : { title: "Maya reached her target on every rep", note: `Your target is ${MAYA_TARGET}°`, ok: true },
    { title: "Rohan finished his week", note: `All ${count(rohan.days, "done")} sessions done`, ok: true },
  ];
  return (
    <PanelFrame id="alerts">
      <ul className="grid w-full max-w-[360px] gap-2.5">
        {alerts.map((a) => (
          <li key={a.title} className={`${cardClass} flex gap-3`}>
            <Dot ok={a.ok} />
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-text">{a.title}</span>
              <span className="mt-0.5 block text-[13px] text-muted">{a.note}</span>
            </span>
          </li>
        ))}
      </ul>
    </PanelFrame>
  );
}

function PrescriptionPanel() {
  return (
    <PanelFrame id="rx">
      <ul className="grid w-full max-w-[380px] gap-2.5">
        {PLAN_ITEMS.map((item) => (
          <li key={item.name} className={`${cardClass} flex items-center gap-3 py-3`}>
            <Image src={item.img} alt="" width={44} height={44} unoptimized className="size-11 shrink-0 rounded-lg object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-text">{item.name}</span>
              <span className="block text-[13px] text-muted">{item.dose}</span>
            </span>
            <span className="shrink-0 rounded-md bg-surface-2 px-2.5 py-1 text-[13px] text-text">Edit</span>
          </li>
        ))}
      </ul>
    </PanelFrame>
  );
}

const CHART = { w: 240, h: 96, pad: 6 };

function ReportPanel() {
  const clip = usePoseClip();
  const depths = clip ? weekDepths(clip) : null;
  // Higher on the chart is a deeper bend, so the line climbs as Maya improves.
  const lo = Math.min(MAYA_TARGET, ...(depths ?? [MAYA_TARGET])) - 6;
  const hi = Math.max(...(depths ?? [MAYA_TARGET + 40])) + 4;
  const y = (deg: number) => CHART.pad + ((deg - lo) / (hi - lo)) * (CHART.h - CHART.pad * 2);
  const x = (i: number, n: number) => CHART.pad + (i / Math.max(1, n - 1)) * (CHART.w - CHART.pad * 2);
  const first = depths ? Math.round(depths[0]) : null;
  const last = depths ? Math.round(depths[depths.length - 1]) : null;

  return (
    <PanelFrame id="report">
      <div className={`${cardClass} grid w-full max-w-[320px] gap-3 p-5 sm:p-6`}>
        <div>
          <p className="font-serif text-[22px] leading-tight text-text">Weekly report</p>
          <p className="mt-0.5 text-[13px] text-muted">
            {MAYA.name}, week {MAYA.week}
          </p>
        </div>
        <svg
          viewBox={`0 0 ${CHART.w} ${CHART.h}`}
          className="h-auto w-full"
          role="img"
          aria-label={first !== null ? `Deepest knee bend from ${first}° to ${last}°, against a ${MAYA_TARGET}° target` : "Deepest knee bend per session"}
        >
          <line
            x1={0}
            x2={CHART.w}
            y1={y(MAYA_TARGET)}
            y2={y(MAYA_TARGET)}
            className="stroke-muted"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          {depths && (
            <>
              <polyline
                fill="none"
                className="stroke-accent"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={depths.map((d, i) => `${x(i, depths.length)},${y(d)}`).join(" ")}
              />
              {depths.map((d, i) => (
                <circle key={i} cx={x(i, depths.length)} cy={y(d)} r={3} className="fill-accent" />
              ))}
            </>
          )}
        </svg>
        <div className="flex justify-between text-[13px] text-muted">
          <span>First session</span>
          <span>This morning</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
          <span className="text-[13px] text-muted">Deepest knee bend</span>
          <span className="text-[15px] font-semibold whitespace-nowrap tabular-nums text-text">{first !== null ? `${first}° to ${last}°` : "--"}</span>
        </div>
      </div>
    </PanelFrame>
  );
}

/** Bar heights for the voice note's waveform, in px. */
const WAVE = Array.from({ length: 18 }, (_, i) => Math.round(6 + Math.abs(Math.sin(i * 1.7)) * 14));

function MessagingPanel() {
  const bubble = "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug";
  return (
    <PanelFrame id="msg">
      <div className="flex w-full max-w-[360px] flex-col gap-2.5">
        <p className={`${bubble} self-start border border-line bg-surface text-text`}>My knee felt tight on the last set.</p>
        <p className={`${bubble} flex items-center gap-2.5 self-end bg-accent text-on-accent`}>
          <svg viewBox="0 0 24 24" aria-hidden className="size-4 shrink-0" fill="currentColor">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" />
          </svg>
          <span aria-hidden className="flex h-5 items-center gap-[2px]">
            {WAVE.map((h, i) => (
              <span key={i} className="block w-[3px] rounded-full bg-current" style={{ height: h }} />
            ))}
          </span>
          <span className="sr-only">Voice note,</span>
          <span className="tabular-nums">0:14</span>
        </p>
        <p className={`${bubble} self-end bg-accent text-on-accent`}>Slow down on the way down, and reach {MAYA_TARGET}° on every rep.</p>
      </div>
    </PanelFrame>
  );
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const SHORT_DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Two weeks of November 2026, from Monday the 2nd. Built from real dates, so each day sits under its weekday. */
export const CALENDAR_START = new Date(2026, 10, 2);
const DAYS = Array.from({ length: 14 }, (_, i) => new Date(2026, 10, CALENDAR_START.getDate() + i).getDate());
/** Maya's video check-in, a Thursday. */
export const BOOKED = 5;
const TAKEN = [3, 7, 10, 12];
const BOOKED_LABEL = `${SHORT_DAY[new Date(2026, 10, BOOKED).getDay()]} ${BOOKED}, 10:30`;

function BookingPanel() {
  return (
    <PanelFrame id="book">
      <div className={`${cardClass} grid w-full max-w-[340px] gap-3`}>
        <p className="text-[15px] font-semibold text-text">November</p>
        <div aria-hidden className="grid grid-cols-7 gap-1.5 text-center text-[13px] tabular-nums">
          {WEEKDAYS.map((d, i) => (
            <span key={`d${i}`} className="py-1 text-muted">
              {d}
            </span>
          ))}
          {DAYS.map((d) => (
            <span
              key={d}
              className={`rounded-lg py-2 ${d === BOOKED ? "bg-accent text-on-accent" : TAKEN.includes(d) ? "bg-surface-2 text-text" : "text-text"}`}
            >
              {d}
            </span>
          ))}
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3 text-[15px]">
          <span className="text-text">Maya, video check-in</span>
          <span className="font-semibold text-text">{BOOKED_LABEL}</span>
        </div>
      </div>
    </PanelFrame>
  );
}

const CALL_ICONS = [
  // Microphone, camera, end call.
  <path key="mic" d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4" />,
  <path key="cam" d="M3 7.5A1.5 1.5 0 0 1 4.5 6h9A1.5 1.5 0 0 1 15 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 3 16.5zM15 10.5l6-3.5v10l-6-3.5" />,
  <path key="end" d="M3.5 14.5c4.7-4.2 12.3-4.2 17 0l-2 2.5-3.2-1.6.3-2.4a10 10 0 0 0-7.2 0l.3 2.4L5.5 17z" />,
];

function TelePanel() {
  // The call tile is drawn at half the photo's pixel size, so it stays sharp on 2x screens.
  return (
    <PanelFrame id="tele">
      <div className={`${cardClass} grid justify-items-center gap-3 p-3`}>
        <div className="relative h-[240px] w-[180px] overflow-hidden rounded-lg">
          <Image src="/images/avatars/maya-call.webp" alt="Maya on a video call" fill sizes="180px" className="object-cover" />
          <span className="absolute bottom-2 left-2 rounded-md bg-[rgba(10,14,15,.62)] px-2 py-0.5 text-[13px] text-white">Maya Thomas</span>
          <Image
            src="/images/avatars/physio.webp"
            alt="Her physio"
            width={64}
            height={64}
            unoptimized
            className="absolute top-2 right-2 size-16 rounded-md border-2 border-white object-cover"
          />
        </div>
        <div aria-hidden className="flex gap-3">
          {CALL_ICONS.map((icon, i) => (
            <span
              key={i}
              className={`flex size-10 items-center justify-center rounded-full ${i === 2 ? "bg-warn text-surface" : "bg-surface-2 text-text"}`}
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                {icon}
              </svg>
            </span>
          ))}
        </div>
      </div>
    </PanelFrame>
  );
}

const CLINICS = [
  { name: "Koregaon Park", physios: 4, patients: 62 },
  { name: "Baner", physios: 2, patients: 31 },
  { name: "Andheri West", physios: 3, patients: 48 },
];

function MultiClinicPanel() {
  return (
    <PanelFrame id="multi">
      <ul className="grid w-full max-w-[360px] gap-2.5">
        {CLINICS.map((c) => (
          <li key={c.name} className={`${cardClass} flex items-baseline justify-between gap-4`}>
            <span className="text-[15px] font-semibold text-text">{c.name}</span>
            <span className="text-[13px] text-muted">
              {c.physios} physios, {c.patients} patients
            </span>
          </li>
        ))}
      </ul>
    </PanelFrame>
  );
}

/** Panels by card id, in the order the cards appear. */
export const FEATURE_PANELS: Record<string, () => ReactNode> = {
  form: FormPanel,
  dash: DashPanel,
  alerts: AlertsPanel,
  rx: PrescriptionPanel,
  report: ReportPanel,
  msg: MessagingPanel,
  book: BookingPanel,
  tele: TelePanel,
  multi: MultiClinicPanel,
};

