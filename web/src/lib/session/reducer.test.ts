import { describe, expect, it } from "vitest";
import { cleanCue, encodeFrame, parseKeypoints, parseServerMessage, retryDelayMs, scoreBand, wsUrl, type PoseUpdate } from "./protocol";
import { initialState, sessionReducer, summarize, type SessionState } from "./reducer";

function update(partial: Partial<PoseUpdate>): PoseUpdate {
  return {
    stage: "start",
    rep_count: 0,
    last_rep_score: null,
    session_avg_score: null,
    feedback: "",
    severity: "",
    angle: null,
    angle2: null,
    hold_progress: 0,
    reps_target: 10,
    complete: false,
    view: "side",
    summary: null,
    ...partial,
  };
}

function live(): SessionState {
  let s = sessionReducer(initialState, { type: "start" });
  s = sessionReducer(s, { type: "go_live" });
  return sessionReducer(s, { type: "open" });
}

describe("sessionReducer", () => {
  it("moves select -> align -> live", () => {
    const align = sessionReducer(initialState, { type: "start" });
    expect(align.phase).toBe("align");
    const l = sessionReducer(align, { type: "go_live" });
    expect(l.phase).toBe("live");
    expect(l.connection).toEqual({ status: "connecting" });
  });

  it("appends the score when rep_count rises and last_rep_score is set", () => {
    let s = live();
    s = sessionReducer(s, { type: "message", message: update({ rep_count: 1, last_rep_score: 84 }) });
    expect(s.scores).toEqual([84]);
    s = sessionReducer(s, { type: "message", message: update({ rep_count: 1, last_rep_score: 84 }) });
    expect(s.scores).toEqual([84]);
    s = sessionReducer(s, { type: "message", message: update({ rep_count: 2, last_rep_score: 61.5 }) });
    expect(s.scores).toEqual([84, 61.5]);
    expect(s.lastRepCount).toBe(2);
  });

  it("does not append when last_rep_score is null", () => {
    const s = sessionReducer(live(), { type: "message", message: update({ rep_count: 1, last_rep_score: null }) });
    expect(s.scores).toEqual([]);
  });

  it("moves to the report on a complete message with a summary", () => {
    const summary = { avg_score: 80, max_score: 90, min_score: 70, reps_completed: 3, completion_pct: 100, scores: [80, 90, 70] };
    const s = sessionReducer(live(), {
      type: "message",
      message: update({ rep_count: 3, last_rep_score: 70, complete: true, summary }),
    });
    expect(s.phase).toBe("report");
    expect(s.summary).toEqual(summary);
    expect(s.completed).toBe(true);
  });

  it("still reports when a complete message has no summary", () => {
    let s = live();
    s = sessionReducer(s, { type: "message", message: update({ rep_count: 1, last_rep_score: 60 }) });
    s = sessionReducer(s, { type: "message", message: update({ rep_count: 2, last_rep_score: 80, complete: true }) });
    expect(s.phase).toBe("report");
    expect(s.summary).toMatchObject({ avg_score: 70, reps_completed: 2, completion_pct: 20 });
  });

  it("shows server errors as an error cue without leaving the session", () => {
    const s = sessionReducer(live(), { type: "message", message: { error: "Bad frame: Empty frame" } });
    expect(s.phase).toBe("live");
    expect(s.cue).toEqual({ text: "Bad frame: Empty frame", severity: "error" });
  });

  it("cleans em dashes out of cues", () => {
    const s = sessionReducer(live(), {
      type: "message",
      message: update({ feedback: "Keep extending — you are halfway there.", severity: "warning" }),
    });
    expect(s.cue?.text).toBe("Keep extending, you are halfway there.");
  });

  it("stop with reps shows a report built from the scores", () => {
    let s = live();
    s = sessionReducer(s, { type: "message", message: update({ rep_count: 1, last_rep_score: 90 }) });
    s = sessionReducer(s, { type: "stop" });
    expect(s.phase).toBe("report");
    expect(s.completed).toBe(false);
    expect(s.summary?.reps_completed).toBe(1);
  });

  it("stop without reps goes back to select", () => {
    const s = sessionReducer(live(), { type: "stop" });
    expect(s.phase).toBe("select");
  });

  it("tracks retries and the final failure", () => {
    let s = sessionReducer(live(), { type: "closed", attempt: 1, reconnect: true });
    expect(s.connection).toEqual({ status: "retrying", attempt: 1, reconnect: true });
    s = sessionReducer(s, { type: "failed" });
    expect(s.connection).toEqual({ status: "failed" });
    s = sessionReducer(s, { type: "retry_connection" });
    expect(s.connection).toEqual({ status: "connecting" });
    expect(s.socketRun).toBe(1);
  });

  it("ignores messages outside the live phase", () => {
    const s = sessionReducer(initialState, { type: "message", message: update({ rep_count: 1, last_rep_score: 90 }) });
    expect(s).toBe(initialState);
  });

  it("reset keeps the choices and returns to select", () => {
    let s = sessionReducer(initialState, { type: "choose", exercise: "shoulder_raises", side: "right", repsTarget: 15 });
    s = sessionReducer(s, { type: "start" });
    s = sessionReducer(s, { type: "reset" });
    expect(s).toMatchObject({ phase: "select", exercise: "shoulder_raises", side: "right", repsTarget: 15 });
  });
});

describe("summarize", () => {
  it("computes the report numbers", () => {
    expect(summarize([80, 90, 70], 10)).toEqual({
      avg_score: 80,
      max_score: 90,
      min_score: 70,
      reps_completed: 3,
      completion_pct: 30,
      scores: [80, 90, 70],
    });
  });
});

describe("protocol", () => {
  it("builds the socket URL", () => {
    expect(wsUrl("wss://x.test/ws/pose", "knee_extension", "left", 10)).toBe("wss://x.test/ws/pose/knee_extension/left?reps_target=10");
    expect(wsUrl("wss://x.test/ws/pose/", "shoulder_raises", "right", 5)).toBe("wss://x.test/ws/pose/shoulder_raises/right?reps_target=5");
  });

  it("encodes frames", () => {
    expect(encodeFrame("abc")).toBe('{"frame":"abc"}');
  });

  it("parses server messages", () => {
    expect(parseServerMessage('{"error":"nope"}')).toEqual({ error: "nope" });
    expect(parseServerMessage(JSON.stringify(update({ rep_count: 2 })))).toMatchObject({ rep_count: 2 });
    expect(parseServerMessage("not json")).toBeNull();
    expect(parseServerMessage('{"hello":1}')).toBeNull();
  });

  it("parses the keypoints sent with each frame", () => {
    const keypoints = Array.from({ length: 33 }, (_, i) => [i / 100, 0.5, 0.9]);
    const parsed = parseServerMessage(JSON.stringify({ ...update({ rep_count: 1 }), keypoints })) as PoseUpdate;
    expect(parsed.rep_count).toBe(1);
    expect(parsed.keypoints).toHaveLength(33);
    expect(parsed.keypoints?.[11]).toEqual([0.11, 0.5, 0.9]);
  });

  it("reads missing, null or malformed keypoints as no person, and drops only bad landmarks", () => {
    // An older server sends no keypoints at all; the rest of the message still counts.
    expect(parseServerMessage(JSON.stringify(update({ rep_count: 3 })))).toMatchObject({ rep_count: 3, keypoints: null });
    expect((parseServerMessage(JSON.stringify({ ...update({}), keypoints: null })) as PoseUpdate).keypoints).toBeNull();
    expect((parseServerMessage(JSON.stringify({ ...update({}), keypoints: "x" })) as PoseUpdate).keypoints).toBeNull();
    expect((parseServerMessage(JSON.stringify({ ...update({}), keypoints: [[1, "a", 1], null] })) as PoseUpdate).keypoints).toBeNull();
    expect(parseKeypoints([[0.1, 0.2, 0.9], [0.3], null, [0.4, 0.5, 0.6, 7], [NaN, 0, 1]])).toEqual([[0.1, 0.2, 0.9], null, null, [0.4, 0.5, 0.6], null]);
  });

  it("uses attempt x 3 s retry delays", () => {
    expect([1, 2, 3, 4, 5].map(retryDelayMs)).toEqual([3000, 6000, 9000, 12000, 15000]);
  });

  it("bands scores", () => {
    expect([80, 79.9, 55, 54].map(scoreBand)).toEqual(["good", "ok", "ok", "low"]);
  });

  it("cleans cues", () => {
    expect(cleanCue("Get into starting position — ensure your full body is visible.")).toBe(
      "Get into starting position, ensure your full body is visible.",
    );
    expect(cleanCue("Nice 💪 work")).toBe("Nice work");
  });
});
