import { cleanCue, type ExerciseKey, type Facing, isServerError, type PoseUpdate, type ServerMessage, type Side, type Summary } from "./protocol";

export type Phase = "select" | "align" | "live" | "report";

export type Connection =
  | { status: "idle" }
  | { status: "connecting" }
  | { status: "live" }
  /** The socket closed. `attempt` counts retries from 1. `reconnect` is true when it had been live before. */
  | { status: "retrying"; attempt: number; reconnect: boolean }
  | { status: "failed" };

export type Cue = { text: string; severity: PoseUpdate["severity"] };

export type SessionState = {
  phase: Phase;
  exercise: ExerciseKey;
  side: Side;
  repsTarget: number;
  facing: Facing;
  connection: Connection;
  latest: PoseUpdate | null;
  cue: Cue | null;
  scores: number[];
  lastRepCount: number;
  summary: Summary | null;
  /** True when the server said the session is complete, false when the visitor ended it. */
  completed: boolean;
  /** Bumped to restart the camera ("Try again" after a camera error). */
  cameraRun: number;
  /** Bumped to restart the connection ("Try again" after the final connection error). */
  socketRun: number;
};

export type SessionAction =
  | { type: "choose"; exercise?: ExerciseKey; side?: Side; repsTarget?: number }
  | { type: "start" }
  | { type: "go_live" }
  | { type: "open" }
  | { type: "closed"; attempt: number; reconnect: boolean }
  | { type: "failed" }
  | { type: "message"; message: ServerMessage }
  | { type: "stop" }
  | { type: "retry_camera" }
  | { type: "retry_connection" }
  | { type: "switch_camera" }
  | { type: "reset" };

export const initialState: SessionState = {
  phase: "select",
  exercise: "knee_extension",
  side: "left",
  repsTarget: 10,
  facing: "environment",
  connection: { status: "idle" },
  latest: null,
  cue: null,
  scores: [],
  lastRepCount: 0,
  summary: null,
  completed: false,
  cameraRun: 0,
  socketRun: 0,
};

function freshSession(state: SessionState): SessionState {
  return {
    ...state,
    connection: { status: "idle" },
    latest: null,
    cue: null,
    scores: [],
    lastRepCount: 0,
    summary: null,
    completed: false,
  };
}

export function summarize(scores: number[], repsTarget: number): Summary {
  if (scores.length === 0) {
    return { avg_score: 0, max_score: 0, min_score: 0, reps_completed: 0, completion_pct: 0, scores: [] };
  }
  const total = scores.reduce((a, b) => a + b, 0);
  return {
    avg_score: Math.round(total / scores.length),
    max_score: Math.round(Math.max(...scores)),
    min_score: Math.round(Math.min(...scores)),
    reps_completed: scores.length,
    completion_pct: Math.round((scores.length / repsTarget) * 100),
    scores: [...scores],
  };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "choose":
      if (state.phase !== "select") return state;
      return {
        ...state,
        exercise: action.exercise ?? state.exercise,
        side: action.side ?? state.side,
        repsTarget: action.repsTarget ?? state.repsTarget,
      };

    case "start":
      if (state.phase !== "select") return state;
      return { ...freshSession(state), phase: "align" };

    case "go_live":
      if (state.phase !== "align") return state;
      return { ...freshSession(state), phase: "live", connection: { status: "connecting" } };

    case "open":
      if (state.phase !== "live") return state;
      return {
        ...state,
        connection: { status: "live" },
        cue: state.latest ? state.cue : { text: "Session started. Get into your starting position.", severity: "" },
      };

    case "closed":
      if (state.phase !== "live") return state;
      return { ...state, connection: { status: "retrying", attempt: action.attempt, reconnect: action.reconnect } };

    case "failed":
      if (state.phase !== "live") return state;
      return { ...state, connection: { status: "failed" } };

    case "message": {
      if (state.phase !== "live") return state;
      const message = action.message;
      if (isServerError(message)) {
        return { ...state, cue: { text: cleanCue(message.error), severity: "error" } };
      }
      let { scores, lastRepCount } = state;
      if (message.rep_count > lastRepCount && message.last_rep_score !== null) {
        scores = [...scores, message.last_rep_score];
        lastRepCount = message.rep_count;
      }
      const next: SessionState = {
        ...state,
        latest: message,
        cue: message.feedback ? { text: cleanCue(message.feedback), severity: message.severity } : state.cue,
        scores,
        lastRepCount,
      };
      if (message.complete) {
        const summary = message.summary ?? summarize(scores, state.repsTarget);
        return { ...next, phase: "report", summary, completed: true, connection: { status: "idle" } };
      }
      return next;
    }

    case "stop":
      if (state.phase !== "live" && state.phase !== "align") return state;
      if (state.scores.length > 0) {
        return {
          ...state,
          phase: "report",
          summary: summarize(state.scores, state.repsTarget),
          completed: false,
          connection: { status: "idle" },
        };
      }
      return { ...freshSession(state), phase: "select" };

    case "retry_camera":
      return { ...state, cameraRun: state.cameraRun + 1 };

    case "retry_connection":
      if (state.phase !== "live") return state;
      return { ...state, connection: { status: "connecting" }, socketRun: state.socketRun + 1 };

    case "switch_camera":
      return { ...state, facing: state.facing === "environment" ? "user" : "environment" };

    case "reset":
      return { ...freshSession(state), phase: "select" };
  }
}
