import type { ExerciseKey, Side } from "./protocol";
import poses from "./exercise-poses.json";

type Point = [number, number];

/** MediaPipe pose output for one exercise photo in public/images/session (see credits/session.md). */
export type ExercisePose = {
  w: number;
  h: number;
  /** The body side doing the exercise in the photo. Choosing the other side mirrors it. */
  side: Side;
  /** The three joints of the measured angle, vertex in the middle. */
  joints: [string, string, string];
  points: [Point, Point, Point];
  /** Interior angle at the vertex, whole degrees. */
  angle: number;
  /** [MediaPipe landmark id, x, y, visibility] for every landmark found. */
  landmarks: [number, number, number, number][];
};

export function exercisePose(key: ExerciseKey): ExercisePose {
  return (poses as unknown as Record<ExerciseKey, ExercisePose>)[key];
}

export function exerciseImage(key: ExerciseKey): string {
  return `/images/session/${key}.webp`;
}

/**
 * Horizontal object-position for a square crop of the photo. The straight leg raise fills the
 * frame, so its square crop moves left to keep the raised foot in.
 */
export function squareCropX(key: ExerciseKey): string {
  return key === "straight_leg_raise" ? "30%" : "50%";
}

/** The pose as seen from `side`: mirrored when the photo shows the other side. */
export function poseFor(pose: ExercisePose, side: Side): { mirrored: boolean; points: [Point, Point, Point]; landmarks: Point[] } {
  const mirrored = pose.side !== side;
  const x = (v: number) => (mirrored ? pose.w - v : v);
  return {
    mirrored,
    points: pose.points.map(([px, py]) => [x(px), py]) as [Point, Point, Point],
    landmarks: pose.landmarks.map(([, px, py]) => [x(px), py]),
  };
}

/**
 * What the preview shows as the measured angle. A straight leg raise is measured as the leg's lift
 * off the floor: the angle between the leg and the torso line carried on past the hip (dashed),
 * which is 180 minus the angle at the hip. `reference` is that carried-on line's far end, `length`
 * units from the vertex, or null when the angle is between the limbs themselves. `label` is then
 * where the reading goes: a point on the line just past the arc, and the direction to push the
 * label off it (away from the leg).
 */
export function measuredAngle(
  key: ExerciseKey,
  angle: number,
  points: [Point, Point, Point],
  length = 300,
): { degrees: number; arcPoints: [Point, Point, Point]; reference: Point | null; label: { at: Point; dir: Point } | null } {
  if (key !== "straight_leg_raise") return { degrees: angle, arcPoints: points, reference: null, label: null };
  const [a, b, c] = points;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const r: Point = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const reference: Point = [b[0] + r[0] * length, b[1] + r[1] * length];
  // Of the two perpendiculars to the line, the one pointing away from the leg.
  const perp: Point = r[1] * (c[0] - b[0]) - r[0] * (c[1] - b[1]) > 0 ? [-r[1], r[0]] : [r[1], -r[0]];
  const label = { at: [b[0] + r[0] * 110, b[1] + r[1] * 110] as Point, dir: perp };
  return { degrees: 180 - angle, arcPoints: [reference, b, c], reference, label };
}

/**
 * The arc between the two limbs at the vertex, as an SVG path of radius `r`, and the unit
 * direction pointing away from the inside of the angle (where a label can sit clear of the limbs).
 */
export function angleGeometry(points: [Point, Point, Point], r: number): { arc: string; out: Point } {
  const [a, b, c] = points;
  const unit = (p: Point): Point => {
    const len = Math.hypot(p[0] - b[0], p[1] - b[1]) || 1;
    return [(p[0] - b[0]) / len, (p[1] - b[1]) / len];
  };
  const ua = unit(a);
  const uc = unit(c);
  // In SVG's y-down space a positive cross product means turning clockwise from ua to uc.
  const sweep = ua[0] * uc[1] - ua[1] * uc[0] > 0 ? 1 : 0;
  const start = [b[0] + ua[0] * r, b[1] + ua[1] * r];
  const end = [b[0] + uc[0] * r, b[1] + uc[1] * r];
  const arc = `M ${start[0].toFixed(1)} ${start[1].toFixed(1)} A ${r} ${r} 0 0 ${sweep} ${end[0].toFixed(1)} ${end[1].toFixed(1)}`;

  const mid: Point = [ua[0] + uc[0], ua[1] + uc[1]];
  const len = Math.hypot(mid[0], mid[1]);
  // A straight limb has no inside: put the label above it.
  const out: Point = len < 0.2 ? [0, -1] : [-mid[0] / len, -mid[1] / len];
  return { arc, out };
}
