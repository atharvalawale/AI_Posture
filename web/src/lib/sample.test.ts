// @vitest-environment node
import { describe, expect, it } from "vitest";
import fixture from "../../public/media/squat.pose.json";
import type { PoseClip } from "./pose/clip";
import { findReps, formScore } from "./pose/score";
import { KABIR, MAYA_SESSION, MAYA_WEEK, PATIENTS, TODAY, WEEKDAYS, lastSession, sessionsText, weekCount } from "./sample";

const clip = fixture as PoseClip;
const depths = findReps(clip).map((r) => r.depth);

// Maya's numbers appear on several screens of the home page. They must agree with the clip and with each other.
describe("Maya's session", () => {
  it("has set 1's depths from the clip", () => {
    expect([...MAYA_SESSION.depths]).toEqual(depths.map(Math.round));
  });

  it("has the clip's form score", () => {
    expect(MAYA_SESSION.formScore).toBe(formScore(depths, MAYA_SESSION.target));
    expect(MAYA_SESSION.formScore).toBe(99);
  });

  it("has its deepest bend from the clip", () => {
    expect(MAYA_SESSION.deepest).toBe(Math.round(Math.min(...depths)));
  });

  it("says how far the score moved since yesterday, the day before today in the week", () => {
    const yesterday = MAYA_WEEK[TODAY - 1];
    expect(typeof yesterday).toBe("number");
    expect(MAYA_SESSION.change).toBe(MAYA_SESSION.formScore - (yesterday as number));
    expect(MAYA_SESSION.change).toBe(6);
  });

  it("says what the rep charts show: the first 3 reps of set 1", () => {
    expect(MAYA_SESSION.setLabel).toBe(`Set 1, first ${MAYA_SESSION.depths.length} reps`);
  });
});

// Today is Sunday, and the session this morning counts as done, on every page.
describe("today", () => {
  const patient = (id: string) => PATIENTS.find((p) => p.id === id)!;

  it("is Sunday, the last day of the week", () => {
    expect(TODAY).toBe(6);
    expect(WEEKDAYS[TODAY]).toBe("Sunday");
    expect(MAYA_SESSION.today).toBe("Sunday");
  });

  it("has Maya's score from this morning's session in her week", () => {
    expect(MAYA_WEEK).toEqual([84, 88, "missed", 90, 91, 93, 99]);
    expect(MAYA_WEEK[TODAY]).toBe(MAYA_SESSION.formScore);
  });

  it("counts as done for every patient on the dashboard", () => {
    for (const p of PATIENTS) expect(p.days[TODAY]).toBe("done");
    expect(patient("maya").days).toEqual(MAYA_WEEK.map((d) => (d === "missed" ? "missed" : "done")));
  });

  it("puts every patient's last session this morning", () => {
    for (const p of PATIENTS) expect(lastSession(p.days)).toBe("this morning");
    expect(lastSession(["done", "done", "missed", "missed", "missed", "missed", "missed"])).toBe("on Tuesday");
    expect(lastSession(["missed", "missed", "missed", "missed", "missed", "missed", "missed"])).toBeNull();
  });

  it("keeps Arjun's four missed days: Tuesday, Wednesday, Friday and Saturday", () => {
    const arjun = patient("arjun");
    expect(arjun.days.flatMap((d, i) => (d === "missed" ? [WEEKDAYS[i]] : []))).toEqual(["Tuesday", "Wednesday", "Friday", "Saturday"]);
    expect(weekCount(arjun.days)).toEqual({ done: 3, missed: 4 });
    expect(arjun.flags[0].text).toBe("Missed 4 sessions this week");
  });

  it("writes each week's sessions from its days, today included", () => {
    expect(PATIENTS.map((p) => p.sessions)).toEqual(["6 of 7", "3 of 7", "7 of 7"]);
    for (const p of PATIENTS) expect(p.sessions).toBe(sessionsText(p.days));
    expect(patient("rohan").flags[0].text).toBe("Every session done this week");
    expect(KABIR.sessions).toBe("5 of 7");
  });
});
