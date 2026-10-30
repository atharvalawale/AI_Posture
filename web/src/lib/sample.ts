import { MEASURES, type Direction } from "@/lib/pose";
import { formScore } from "./pose/score";

/** Sample exercise plan shown in the app preview. Sample data, not a claim about FiixBE. */
export const PLAN_ITEMS: { name: string; dose: string; img: string; target?: string }[] = [
  { name: "Squats", dose: "3 sets of 10", img: "/images/home/plan-squats.webp" },
  { name: "Hamstring stretch", dose: "3 holds of 30 seconds", img: "/images/home/plan-hamstring-stretch.webp" },
  { name: "Split squats", dose: "2 sets of 8 each leg", img: "/images/home/plan-split-squats.webp" },
];

/** The note from Maya's physio with this week's plan. Her plan screen and the physio's plan editor show the same words. */
export const PHYSIO_NOTE = "Your depth is much better this week. I have added split squats. Go slow on the way down.";

/** How a day of the week went. Today counts as done: its session took place this morning. */
export type DayMark = "done" | "missed";

/** The days of the sample week, Monday first, as the dashboard names them. */
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/** Today is Sunday, the last day of the sample week. Every patient's session today took place this morning. */
export const TODAY = 6;

/**
 * Maya's knee bend target when the page opens, in degrees: the target the live session on her phone measures
 * against. The dashboard, the feature panels, her progress chart and the messages all start from it.
 */
export const MAYA_TARGET = MEASURES.knee.target;

// Set 1 of this morning's squats: the deepest knee bend of each rep in the clip, rounded as every screen shows it.
// sample.test.ts pins these to the clip, so the phone, the readouts and the charts can't drift apart.
const DEPTHS = [95, 102, 99] as const;
const FORM_SCORE = formScore(DEPTHS, MAYA_TARGET) as number;

/**
 * Maya's week of squats, as her form score per day. Sample data, shown only in product views.
 * Wednesday was missed. Sunday is today: its score is this morning's session, the squat clip.
 */
export const MAYA_WEEK: readonly (number | "missed")[] = [84, 88, "missed", 90, 91, 93, FORM_SCORE];

/** Maya's squat session this morning: the clip's set 1, its target, its form score and the change since yesterday. */
export const MAYA_SESSION = {
  target: MAYA_TARGET,
  depths: DEPTHS,
  deepest: Math.min(...DEPTHS),
  formScore: FORM_SCORE,
  change: FORM_SCORE - (MAYA_WEEK[TODAY - 1] as number),
  /** The day the session took place, as the screens name it. */
  today: WEEKDAYS[TODAY],
  /** What the rep charts show: the clip holds the first 3 reps of set 1, of a plan of 3 sets of 10. */
  setLabel: "Set 1, first 3 reps",
} as const;

/** How many days of the week were done and missed, today included. */
export function weekCount(days: readonly DayMark[]): { done: number; missed: number } {
  const done = days.filter((d) => d === "done").length;
  return { done, missed: days.length - done };
}

/** This week's sessions, as the dashboard writes them, for example "6 of 7". */
export function sessionsText(days: readonly DayMark[]): string {
  return `${weekCount(days).done} of ${days.length}`;
}

/** When the last session took place: "this morning" when today is done, else "on" and its weekday. Null if none. */
export function lastSession(days: readonly DayMark[]): string | null {
  const i = days.lastIndexOf("done");
  if (i < 0) return null;
  return i === TODAY ? "this morning" : `on ${WEEKDAYS[i]}`;
}

/** The flag a physio sees about a patient's week: every session done, or how many were missed. */
function weekFlag(days: readonly DayMark[]): SamplePatient["flags"][number] {
  const { missed } = weekCount(days);
  return missed === 0
    ? { text: "Every session done this week", note: "On track", ok: true }
    : { text: `Missed ${missed} session${missed === 1 ? "" : "s"} this week`, note: "Send a nudge" };
}

/** What a patient's rep bars measure this morning, and the physio's target for it. Sample data, not a claim about FiixBE. */
export type SampleMeasure = {
  label: string;
  target: number;
  /** Lower is better for a knee bend, higher for a raise. */
  direction: Direction;
  /** Angles at the two ends of the bar track. */
  range: [number, number];
  /** The target slider's lowest and highest value. */
  slider: [number, number];
  /** Each rep's angle. Absent for Maya: hers come from the squat clip. */
  values?: number[];
};

/** A patient on the physio dashboard. Sample data, not a claim about FiixBE. */
export type SamplePatient = {
  id: "maya" | "arjun" | "rohan";
  name: string;
  condition: string;
  week: number;
  exercise: string;
  /** This week, Monday first. */
  days: DayMark[];
  /** The form score comes from these reps against the target, as Maya's comes from her clip. */
  measure: SampleMeasure;
  sessions: string;
  pain: string;
  avatar?: string;
  initials: string;
  /** Exercise photo shown in the replay when there is no footage. */
  still?: string;
  /** Flags that do not depend on the reps. The short-rep flags are computed from the measure. */
  flags: { text: string; note: string; ok?: boolean }[];
};

const MAYA_DAYS: DayMark[] = MAYA_WEEK.map((d) => (d === "missed" ? "missed" : "done"));
// Arjun missed Tuesday, Wednesday, Friday and Saturday, and was back this morning.
const ARJUN_DAYS: DayMark[] = ["done", "missed", "missed", "done", "missed", "missed", "done"];
const ROHAN_DAYS: DayMark[] = ["done", "done", "done", "done", "done", "done", "done"];
// Kabir missed Wednesday and Friday.
const KABIR_DAYS: DayMark[] = ["done", "done", "missed", "done", "missed", "done", "done"];

/**
 * The patients on the For physios dashboard. Each name goes with their media:
 * Maya Thomas is the squat clip, Arjun Mehta the shoulder raises photo, Rohan Kulkarni the straight leg raise photo.
 */
export const PATIENTS: SamplePatient[] = [
  {
    id: "maya",
    name: "Maya Thomas",
    condition: "ACL reconstruction",
    week: 3,
    exercise: "Squats",
    days: MAYA_DAYS,
    measure: { label: `${MAYA_SESSION.setLabel}, deepest knee bend`, target: MAYA_TARGET, direction: "lower", range: [60, 180], slider: [85, 130] },
    sessions: sessionsText(MAYA_DAYS),
    pain: "2 of 10",
    avatar: "/images/avatars/maya.webp",
    initials: "MT",
    flags: [{ text: "Pain down from 4 last week", note: "Good", ok: true }],
  },
  {
    id: "arjun",
    name: "Arjun Mehta",
    condition: "Rotator cuff repair",
    week: 6,
    exercise: "Shoulder raises",
    days: ARJUN_DAYS,
    // Rep 2 is the raise that stopped at 78° on the left, short of his 90° target.
    measure: { label: "Highest left arm raise per rep", target: 90, direction: "higher", range: [30, 120], slider: [70, 120], values: [91, 78, 93] },
    sessions: sessionsText(ARJUN_DAYS),
    pain: "4 of 10",
    initials: "AM",
    still: "/images/session/shoulder_raises.webp",
    flags: [weekFlag(ARJUN_DAYS)],
  },
  {
    id: "rohan",
    name: "Rohan Kulkarni",
    condition: "Hip replacement",
    week: 2,
    exercise: "Straight leg raise",
    days: ROHAN_DAYS,
    measure: { label: "Highest leg lift per rep", target: 40, direction: "higher", range: [0, 60], slider: [25, 60], values: [43, 37, 41] },
    sessions: sessionsText(ROHAN_DAYS),
    pain: "3 of 10",
    initials: "RK",
    still: "/images/session/straight_leg_raise.webp",
    flags: [weekFlag(ROHAN_DAYS)],
  },
];

/** Maya, whose session is the real squat clip. */
export const MAYA = PATIENTS.find((p) => p.id === "maya")!;

/**
 * A fourth sample patient, only in the feature and practice views. No footage, so initials and a fixed score.
 * His exercise is one FiixBE measures, at the knee.
 */
export const KABIR = { name: "Kabir Rao", initials: "KR", exercise: "Knee extension", sessions: sessionsText(KABIR_DAYS), form: 81 };
