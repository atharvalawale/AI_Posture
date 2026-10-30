import type { ExerciseKey } from "@/lib/session/protocol";

export type Area = "knee" | "shoulder" | "hip" | "sports";

/**
 * The areas on the For patients body map. Marketing copy, so every line is true of FiixBE today:
 * the conditions are the page's existing copy and each exercise is one the session page supports.
 */
export const AREAS: { id: Area; button: string; condition: string; body: string; landmarks: number[]; exercise: ExerciseKey | null }[] = [
  {
    id: "knee",
    button: "Knee",
    condition: "Knee rehabilitation",
    body: "After ACL reconstruction, meniscus repair or knee replacement.",
    landmarks: [25],
    exercise: "knee_extension",
  },
  {
    id: "shoulder",
    button: "Shoulder",
    condition: "Shoulder recovery",
    body: "Rotator cuff injuries, frozen shoulder and shoulder replacement.",
    landmarks: [11],
    exercise: "shoulder_raises",
  },
  {
    id: "hip",
    button: "Hip",
    condition: "Hip rehabilitation",
    body: "After hip replacement surgery and hip fractures.",
    landmarks: [23],
    exercise: "straight_leg_raise",
  },
  {
    id: "sports",
    button: "Sports injuries",
    condition: "Sports injuries",
    body: "Sprains, strains and sports-related muscle injuries.",
    landmarks: [25, 11, 23],
    exercise: null,
  },
];
