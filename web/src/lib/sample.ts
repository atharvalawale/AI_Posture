import type { Direction } from "@/lib/pose";
import { formScore } from "./pose/score";

/** Sample exercise plan shown in the app preview. Sample data, not a claim about FiixBE. */
export const PLAN_ITEMS: { name: string; dose: string; img: string; target?: string }[] = [
  { name: "Squats", dose: "3 sets of 10", img: "/images/home/plan-squats.webp" },
  { name: "Hamstring stretch", dose: "3 holds of 30 seconds", img: "/images/home/plan-hamstring-stretch.webp" },
  { name: "Split squats", dose: "2 sets of 8 each leg", img: "/images/home/plan-split-squats.webp" },
];

/** The note from Maya's physio with this week's plan. Her plan screen and the physio's plan editor show the same words. */
export const PHYSIO_NOTE = "Your depth is much better this week. I have added split squats. Go slow on the way down.";

export type DayMark = "done" | "missed" | "today";

/** Maya's knee bend target when the page opens, in degrees. The dashboard, the feature panels and the messages all start from it. */
export const MAYA_TARGET = 100;

/**
 * Maya's week of squats, as her form score per day. Sample data, shown only in product views.
 * Wednesday was missed. Sunday is today: her session this morning is the squat clip.
 */
export const MAYA_WEEK: readonly (number | "missed" | "today")[] = [84, 88, "missed", 90, 91, 93, "today"];

// Set 1 of this morning's squats: the deepest knee bend of each rep in the clip, rounded as every screen shows it.
// sample.test.ts pins these to the clip, so the phone, the readouts and the charts can't drift apart.
const DEPTHS = [95, 102, 99] as const;
const FORM_SCORE = formScore(DEPTHS, MAYA_TARGET) as number;
const YESTERDAY = MAYA_WEEK[MAYA_WEEK.indexOf("today") - 1] as number;

/** Maya's squat session this morning: the clip's set 1, its target, its form score and the change since yesterday. */
export const MAYA_SESSION = {
  target: MAYA_TARGET,
  depths: DEPTHS,
  deepest: Math.min(...DEPTHS),
  formScore: FORM_SCORE,
  change: FORM_SCORE - YESTERDAY,
  /** The day the session took place, as the screens name it. */
  today: "Sunday",
} as const;

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
    days: MAYA_WEEK.map((d): DayMark => (typeof d === "number" ? "done" : d)),
    measure: { label: "Deepest knee bend per rep", target: MAYA_TARGET, direction: "lower", range: [60, 180], slider: [85, 130] },
    sessions: "5 of 6",
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
    days: ["done", "missed", "missed", "done", "missed", "missed", "today"],
    // Rep 2 is the raise that stopped at 78° on the left, short of his 90° target.
    measure: { label: "Highest left arm raise per rep", target: 90, direction: "higher", range: [30, 120], slider: [70, 120], values: [91, 78, 93] },
    sessions: "2 of 6",
    pain: "4 of 10",
    initials: "AM",
    still: "/images/session/shoulder_raises.webp",
    flags: [{ text: "Missed 4 sessions this week", note: "Send a nudge" }],
  },
  {
    id: "rohan",
    name: "Rohan Kulkarni",
    condition: "Hip replacement",
    week: 2,
    exercise: "Straight leg raise",
    days: ["done", "done", "done", "done", "done", "done", "today"],
    measure: { label: "Highest leg lift per rep", target: 40, direction: "higher", range: [0, 60], slider: [25, 60], values: [43, 37, 41] },
    sessions: "6 of 6",
    pain: "3 of 10",
    initials: "RK",
    still: "/images/session/straight_leg_raise.webp",
    flags: [{ text: "Every session done this week", note: "On track", ok: true }],
  },
];

/** Maya, whose session is the real squat clip. */
export const MAYA = PATIENTS.find((p) => p.id === "maya")!;

/** A fourth sample patient, only in the feature and practice views. No footage, so initials and a fixed score. */
export const KABIR = { name: "Kabir Rao", initials: "KR", exercise: "Calf raises", sessions: "4 of 6", form: 81 };
