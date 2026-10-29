import type { ExerciseKey } from "@/lib/session/protocol";

/** Simple line drawings of each exercise. They follow the current text color. */
export function ExerciseIcon({ exercise, className }: { exercise: ExerciseKey; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {exercise === "knee_extension" && (
        <>
          <path d="M10 13v27M10 29h19M29 29v11" opacity=".45" />
          <circle cx="15" cy="9" r="3" />
          <path d="M15 12v14M15 16l5 6M15 26h12l12-5" />
        </>
      )}
      {exercise === "shoulder_raises" && (
        <>
          <circle cx="22" cy="8" r="3" />
          <path d="M22 11v16M22 27l-4 13M22 27l4 13M22 15l-4 10M22 15h15" />
        </>
      )}
      {exercise === "straight_leg_raise" && (
        <>
          <path d="M4 38h40" opacity=".45" />
          <circle cx="8" cy="31" r="3" />
          <path d="M11 33h15l15 0M26 33l11-11M14 33l6 3" />
        </>
      )}
    </svg>
  );
}
