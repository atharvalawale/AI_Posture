import { formScore } from "./pose/score";

/** Sample exercise plan shown in the app preview. Sample data, not a claim about FiixBE. */
export const PLAN_ITEMS: { name: string; dose: string; img: string; target?: string }[] = [
  { name: "Squats", dose: "3 sets of 10", img: "/images/home/plan-squats.webp" },
  { name: "Hamstring stretch", dose: "3 holds of 30 seconds", img: "/images/home/plan-hamstring-stretch.webp" },
  { name: "Split squats", dose: "2 sets of 8 each leg", img: "/images/home/plan-split-squats.webp" },
];

/**
 * Maya's week of squats, as her form score per day. Sample data, shown only in product views.
 * Wednesday was missed. Sunday is today: her session this morning is the squat clip.
 */
export const MAYA_WEEK: readonly (number | "missed" | "today")[] = [84, 88, "missed", 90, 91, 93, "today"];

const TARGET = 100;
// Set 1 of this morning's squats: the deepest knee bend of each rep in the clip, rounded as every screen shows it.
// sample.test.ts pins these to the clip, so the phone, the readouts and the charts can't drift apart.
const DEPTHS = [95, 102, 99] as const;
const FORM_SCORE = formScore(DEPTHS, TARGET) as number;
const YESTERDAY = MAYA_WEEK[MAYA_WEEK.indexOf("today") - 1] as number;

/** Maya's squat session this morning: the clip's set 1, its target, its form score and the change since yesterday. */
export const MAYA_SESSION = {
  target: TARGET,
  depths: DEPTHS,
  deepest: Math.min(...DEPTHS),
  formScore: FORM_SCORE,
  change: FORM_SCORE - YESTERDAY,
  /** The day the session took place, as the screens name it. */
  today: "Sunday",
} as const;
