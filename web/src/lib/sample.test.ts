// @vitest-environment node
import { describe, expect, it } from "vitest";
import fixture from "../../public/media/squat.pose.json";
import type { PoseClip } from "./pose/clip";
import { findReps, formScore } from "./pose/score";
import { MAYA_SESSION, MAYA_WEEK } from "./sample";

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
    const today = MAYA_WEEK.indexOf("today");
    const yesterday = MAYA_WEEK[today - 1];
    expect(typeof yesterday).toBe("number");
    expect(MAYA_SESSION.change).toBe(MAYA_SESSION.formScore - (yesterday as number));
    expect(MAYA_WEEK).toEqual([84, 88, "missed", 90, 91, 93, "today"]);
    expect(MAYA_SESSION.change).toBe(6);
  });
});
