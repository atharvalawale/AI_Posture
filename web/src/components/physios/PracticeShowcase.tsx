"use client";

import { Showcase, type ShowcaseItem } from "@/components/showcase/Showcase";
import { KABIR, PATIENTS } from "@/lib/sample";
import { PanelFrame, cardClass } from "./featurePanels";
import { Avatar } from "./PatientList";
import { useFormScores } from "./usePatientReps";

/** The clinic and hospital lists are the tallest panels, so all three practice frames share their height. */
const PHONE_HEIGHT = "h-[420px]";
const WIDE_HEIGHT = "sm:h-[464px]";

const practices: ShowcaseItem[] = [
  {
    id: "clinics",
    title: "Standalone clinics",
    body: "See more patients without hiring more staff. Follow home exercise between visits and keep clinic time for complex cases.",
  },
  {
    id: "hospitals",
    title: "Hospital departments",
    body: "Streamline post-operative rehab. Discharge patients knowing their home exercise is supervised.",
  },
  {
    id: "independent",
    title: "Independent physios",
    body: "Build your own practice and reach patients wherever they live in India.",
  },
];

/** A clinic's day: who is in the room, and how the patients exercising at home are scoring. */
function ClinicPanel() {
  const formOf = useFormScores();
  const home = [
    ...PATIENTS.map((p) => ({ name: p.name, avatar: p.avatar, initials: p.initials, exercise: p.exercise, form: formOf(p) })),
    { ...KABIR, avatar: undefined },
  ];
  return (
    <PanelFrame id="clinics" phoneHeight={PHONE_HEIGHT} wideHeight={WIDE_HEIGHT}>
      <div className={`${cardClass} w-full max-w-[400px] p-5`}>
        <p className="text-[13px] text-muted">Today</p>
        <p className="mt-1 font-serif text-[24px] leading-tight text-text">
          <span className="block">4 in clinic</span>
          <span className="block">11 exercising at home</span>
        </p>
        <ul className="mt-4 border-t border-line">
          {home.map((p) => (
            <li key={p.name} className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
              <Avatar avatar={p.avatar} initials={p.initials} className="size-9" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-text">{p.name}</span>
                <span className="block truncate text-[13px] text-muted">{p.exercise}, at home</span>
              </span>
              <span className="text-[15px] font-semibold tabular-nums text-text">{p.form ?? "--"}</span>
            </li>
          ))}
        </ul>
      </div>
    </PanelFrame>
  );
}

const DISCHARGED = [
  { name: "Neha Joshi", initials: "NJ", surgery: "Knee replacement", day: 3, note: "First home session done" },
  { name: "Sameer Kale", initials: "SK", surgery: "ACL reconstruction", day: 9, note: "5 of 6 this week" },
  { name: "Farah Ansari", initials: "FA", surgery: "Hip replacement", day: 16, note: "Missed 2 sessions", warn: true },
  { name: "Vikram Desai", initials: "VD", surgery: "Rotator cuff repair", day: 24, note: "6 of 6 this week" },
];

/** A hospital department's discharged patients, ordered by days since surgery. */
function HospitalPanel() {
  return (
    <PanelFrame id="hospitals" phoneHeight={PHONE_HEIGHT} wideHeight={WIDE_HEIGHT}>
      <div className={`${cardClass} w-full max-w-[400px] p-5`}>
        <p className="text-[13px] text-muted">Orthopaedics</p>
        <p className="mt-1 font-serif text-[24px] leading-tight text-balance text-text">Discharged, exercising at home</p>
        <ul className="mt-4 border-t border-line">
          {DISCHARGED.map((p) => (
            <li key={p.name} className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
              <span className="w-14 shrink-0 text-[13px] text-muted tabular-nums">Day {p.day}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-text">{p.name}</span>
                <span className="block truncate text-[13px] text-muted">
                  {/* Phones have room for one detail under the name, so it is how the patient is doing. */}
                  <span className="hidden sm:inline">{p.surgery}</span>
                  <span className={`sm:hidden ${p.warn ? "text-warn" : ""}`}>{p.note}</span>
                </span>
              </span>
              <span className={`hidden shrink-0 text-right text-[13px] sm:block ${p.warn ? "text-warn" : "text-muted"}`}>{p.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </PanelFrame>
  );
}

const CITIES = [
  { city: "Pune", patients: 14 },
  { city: "Nashik", patients: 6 },
  { city: "Kolhapur", patients: 4 },
  { city: "Nagpur", patients: 3 },
];

/** An independent physio's patients, spread across cities. */
function IndependentPanel() {
  const most = Math.max(...CITIES.map((c) => c.patients));
  const total = CITIES.reduce((n, c) => n + c.patients, 0);
  return (
    <PanelFrame id="independent" phoneHeight={PHONE_HEIGHT} wideHeight={WIDE_HEIGHT}>
      <div className={`${cardClass} w-full max-w-[400px] p-5`}>
        <p className="text-[13px] text-muted">Your patients</p>
        <p className="mt-1 font-serif text-[24px] leading-tight text-balance text-text">{total} patients in 4 cities</p>
        <ul className="mt-4 grid gap-3">
          {CITIES.map((c) => (
            <li key={c.city} className="grid grid-cols-[5.5rem_minmax(0,1fr)_1.75rem] items-center gap-3">
              <span className="text-[15px] text-text">{c.city}</span>
              <span aria-hidden className="h-2 overflow-hidden rounded-full bg-surface-2">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${(c.patients / most) * 100}%` }} />
              </span>
              <span className="text-right text-[15px] font-semibold tabular-nums text-text">{c.patients}</span>
            </li>
          ))}
        </ul>
      </div>
    </PanelFrame>
  );
}

/** The three kinds of practice, each beside a view of what FiixBE shows that practice. */
export function PracticeShowcase({ className = "" }: { className?: string }) {
  return (
    <Showcase
      className={className}
      label="Kinds of practice"
      layout="cards"
      items={practices}
      panels={[<ClinicPanel key="clinics" />, <HospitalPanel key="hospitals" />, <IndependentPanel key="independent" />]}
    />
  );
}
