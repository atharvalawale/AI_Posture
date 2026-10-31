// Protocol for the pose backend (pose_backend/app/main.py). Keep it in sync with the server.

export type ExerciseKey = "knee_extension" | "shoulder_raises" | "straight_leg_raise";
export type Side = "left" | "right";
export type Facing = "environment" | "user";

export type Exercise = {
  key: ExerciseKey;
  name: string;
  /** One line about the movement, shown on the select step. */
  description: string;
  /** How to set up the camera, shown while getting into position. */
  instruction: string;
  /** What the server's `angle` measures, shown next to the live angle. */
  angleLabel: string;
};

export const EXERCISES: readonly Exercise[] = [
  {
    key: "knee_extension",
    name: "Knee extension",
    description: "Sit upright and slowly straighten your knee. Builds quad strength.",
    instruction: "Point the back camera at your side so your full leg and hip are visible.",
    angleLabel: "Knee",
  },
  {
    key: "shoulder_raises",
    name: "Shoulder raises",
    description: "Raise your arm to shoulder height. Rehabs the rotator cuff.",
    instruction: "Point the camera at your side with your arm and shoulder visible.",
    angleLabel: "Shoulder",
  },
  {
    key: "straight_leg_raise",
    name: "Straight leg raise",
    description: "Lie flat and raise your leg to 45 degrees. Strengthens hip flexors.",
    instruction: "Prop your phone so your full body from hip to foot is in the frame.",
    angleLabel: "Leg",
  },
];

export const REPS_OPTIONS = [5, 10, 15] as const;
export const SIDES: readonly Side[] = ["left", "right"];

export const DEFAULT_WS_BASE = "wss://ai-posture-backend.onrender.com/ws/pose";
export const WS_BASE = process.env.NEXT_PUBLIC_POSE_WS_URL ?? DEFAULT_WS_BASE;

/** One frame every 200 ms, JPEG quality 0.5, as the old page did. */
export const FRAME_INTERVAL_MS = 200;
export const JPEG_QUALITY = 0.5;

/** Render's free tier sleeps. Retry up to 5 times, waiting attempt x 3 s. */
export const MAX_RETRIES = 5;
export function retryDelayMs(attempt: number): number {
  return attempt * 3000;
}

export function getExercise(key: ExerciseKey): Exercise {
  return EXERCISES.find((e) => e.key === key) ?? EXERCISES[0];
}

export type Summary = {
  avg_score: number;
  max_score: number;
  min_score: number;
  reps_completed: number;
  completion_pct: number;
  scores: number[];
};

export type PoseUpdate = {
  stage: string | null;
  rep_count: number;
  last_rep_score: number | null;
  session_avg_score: number | null;
  feedback: string;
  severity: "good" | "success" | "warning" | "error" | "";
  angle: number | null;
  angle2: number | null;
  hold_progress: number;
  reps_target: number;
  complete: boolean;
  view: string | null;
  summary: Summary | null;
  /** The pose the server found in the frame, for drawing the skeleton. Missing from older servers. */
  keypoints?: Keypoints | null;
};

/** One MediaPipe landmark: x and y from 0 to 1 across the frame the server saw, then visibility 0..1. */
export type Keypoint = [x: number, y: number, visibility: number];
/** The 33 MediaPipe pose landmarks, by MediaPipe index. Null when nobody is in the frame. */
export type Keypoints = (Keypoint | null)[];

export type ServerError = { error: string };
export type ServerMessage = PoseUpdate | ServerError;

export function isServerError(message: ServerMessage): message is ServerError {
  return typeof (message as ServerError).error === "string";
}

export function wsUrl(base: string, exercise: string, side: Side, repsTarget: number): string {
  return `${base.replace(/\/+$/, "")}/${exercise}/${side}?reps_target=${repsTarget}`;
}

export function encodeFrame(base64Jpeg: string): string {
  return JSON.stringify({ frame: base64Jpeg });
}

/** Parses a server message. Returns null for anything that is not a known shape. */
export function parseServerMessage(raw: unknown): ServerMessage | null {
  if (typeof raw !== "string") return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.error === "string") return { error: obj.error };
  if (typeof obj.rep_count !== "number") return null;
  return { ...(data as PoseUpdate), keypoints: parseKeypoints(obj.keypoints) };
}

/**
 * Checks the server's `keypoints`. A malformed landmark becomes null and the rest still draw.
 * Anything that is not a list, or has no usable landmark, means no person.
 */
export function parseKeypoints(raw: unknown): Keypoints | null {
  if (!Array.isArray(raw)) return null;
  const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
  const keypoints = raw.map((p): Keypoint | null => (Array.isArray(p) && p.length >= 3 && finite(p[0]) && finite(p[1]) && finite(p[2]) ? [p[0], p[1], p[2]] : null));
  return keypoints.some(Boolean) ? keypoints : null;
}

/**
 * The backend's cue text uses em dashes and exclamation-heavy copy. The site bans the em dash
 * character, so turn "Keep extending — you are halfway there." into "Keep extending, you are
 * halfway there." and drop any emoji.
 */
export function cleanCue(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\p{Extended_Pictographic}️?/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export type ScoreBand = "good" | "ok" | "low";

/** 80 or more is good, 55 or more is ok, anything lower is low. */
export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return "good";
  if (score >= 55) return "ok";
  return "low";
}

export function motivation(avg: number): { title: string; body: string } {
  if (avg >= 85) return { title: "Outstanding session", body: "Excellent form throughout. Your physio will be impressed." };
  if (avg >= 70) return { title: "Great work", body: "Solid form on most reps. Next time, focus on reaching the full range at the top of each rep." };
  if (avg >= 55) return { title: "Good effort", body: "Try holding each rep for two seconds at the top to lift your score." };
  return { title: "Keep going", body: "Move slowly and with control. Form gets better with practice." };
}
