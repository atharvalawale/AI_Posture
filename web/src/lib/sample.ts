/** Sample exercise plan shown in the app preview. Sample data, not a claim about FiixBE. */
export const PLAN_ITEMS: { name: string; dose: string; img: string; target?: string }[] = [
  { name: "Squats", dose: "3 sets of 10", img: "/images/home/plan-squats.webp" },
  { name: "Hamstring stretch", dose: "3 holds of 30 seconds", img: "/images/home/plan-hamstring-stretch.webp" },
  { name: "Split squats", dose: "2 sets of 8 each leg", img: "/images/home/plan-split-squats.webp" },
];

export type DayMark = "done" | "missed" | "today";

/** A patient on the physio dashboard. Sample data, not a claim about FiixBE. */
export type SamplePatient = {
  id: "maya" | "arjun" | "rohan";
  name: string;
  condition: string;
  week: number;
  exercise: string;
  /** This week, Monday first. */
  days: DayMark[];
  /** Form score, or "clip" when it is computed from the squat clip and the physio's target. */
  form: number | "clip";
  sessions: string;
  pain: string;
  avatar?: string;
  initials: string;
  /** Exercise photo shown in the replay when there is no footage. */
  still?: string;
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
    days: ["done", "done", "done", "missed", "done", "done", "today"],
    form: "clip",
    sessions: "5 of 6",
    pain: "2 of 10",
    avatar: "/images/avatars/maya.webp",
    initials: "MT",
    // The short-rep flags are computed from the clip. These follow them.
    flags: [{ text: "Pain down from 4 last week", note: "Good", ok: true }],
  },
  {
    id: "arjun",
    name: "Arjun Mehta",
    condition: "Rotator cuff repair",
    week: 6,
    exercise: "Shoulder raises",
    days: ["done", "missed", "missed", "done", "missed", "missed", "today"],
    form: 74,
    sessions: "2 of 6",
    pain: "4 of 10",
    initials: "AM",
    still: "/images/session/shoulder_raises.webp",
    flags: [
      { text: "Missed 4 sessions this week", note: "Send a nudge" },
      { text: "Raise stopped at 78° on the left", note: "Target 90°" },
    ],
  },
  {
    id: "rohan",
    name: "Rohan Kulkarni",
    condition: "Hip replacement",
    week: 2,
    exercise: "Straight leg raise",
    days: ["done", "done", "done", "done", "done", "done", "today"],
    form: 88,
    sessions: "6 of 6",
    pain: "3 of 10",
    initials: "RK",
    still: "/images/session/straight_leg_raise.webp",
    flags: [{ text: "Every session done this week", note: "On track", ok: true }],
  },
];
