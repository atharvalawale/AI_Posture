import type { ReactNode } from "react";
import { EDGES, JOINTS, type Pose } from "@/lib/pose";

/** A box in SVG units, where 1 unit is 1 px of a 1000 wide video frame. */
export type FigureBounds = { x: number; y: number; w: number; h: number };

/** Frame width in SVG units. Heights scale by the clip's aspect (h / w). */
const FRAME = 1000;
const NOSE = 0;
/** Head radius in SVG units, about a third of the shoulder width in the squat clip. */
const HEAD_R = 52;
const JOINT_R = 13;
const RING_R = 30;
const ARC_R = 70;
/** Strokes keep their width in screen pixels. vector-effect is not inherited, so every shape sets it. */
const NS = "non-scaling-stroke";

/** The two bones each side of a joint, for the angle arc. */
const ARC_RAYS: Record<number, [number, number]> = {
  25: [23, 27],
  26: [24, 28],
  23: [11, 25],
  24: [12, 26],
  11: [23, 13],
  12: [24, 14],
};

/** A landmark in SVG units. `aspect` is clip.h / clip.w. */
export function toSvg(pose: Pose, landmark: number, aspect: number): [number, number] {
  const [x, y] = pose[landmark];
  return [x * FRAME, y * FRAME * aspect];
}

/** The box around every drawn landmark (head included) of all `poses`, with `pad` units on each side. */
export function figureBounds(poses: Pose[], aspect: number, pad = 40): FigureBounds {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const pose of poses) {
    for (const key of Object.keys(pose)) {
      const id = Number(key);
      const [x, y] = toSvg(pose, id, aspect);
      const r = id === NOSE ? HEAD_R : JOINT_R;
      x0 = Math.min(x0, x - r);
      y0 = Math.min(y0, y - r);
      x1 = Math.max(x1, x + r);
      y1 = Math.max(y1, y + r);
    }
  }
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

/** Bones, the neck and the head of one pose, as plain SVG shapes. Colors and dashes come from the parent group. */
function Bones({ pose, aspect }: { pose: Pose; aspect: number }) {
  const at = (id: number) => toSvg(pose, id, aspect);
  const head = pose[NOSE] ? at(NOSE) : null;
  let neck: [number, number, number, number] | null = null;
  if (head && pose[11] && pose[12]) {
    const [lx, ly] = at(11);
    const [rx, ry] = at(12);
    const mx = (lx + rx) / 2;
    const my = (ly + ry) / 2;
    const d = Math.hypot(mx - head[0], my - head[1]);
    // The neck runs from between the shoulders to the edge of the head.
    if (d > HEAD_R) neck = [mx, my, head[0] + ((mx - head[0]) / d) * HEAD_R, head[1] + ((my - head[1]) / d) * HEAD_R];
  }
  return (
    <>
      {EDGES.filter(([a, b]) => pose[a] && pose[b]).map(([a, b]) => {
        const [x1, y1] = at(a);
        const [x2, y2] = at(b);
        return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect={NS} />;
      })}
      {neck && <line x1={neck[0]} y1={neck[1]} x2={neck[2]} y2={neck[3]} vectorEffect={NS} />}
      {head && <circle cx={head[0]} cy={head[1]} r={HEAD_R} fill="none" vectorEffect={NS} />}
    </>
  );
}

/** SVG path of the inner arc at `vertex`, between its two bones. */
function arcPath(pose: Pose, vertex: number, aspect: number): string | null {
  const rays = ARC_RAYS[vertex];
  if (!rays || !pose[vertex] || !pose[rays[0]] || !pose[rays[1]]) return null;
  const [vx, vy] = toSvg(pose, vertex, aspect);
  const [px, py] = toSvg(pose, rays[0], aspect);
  const [qx, qy] = toSvg(pose, rays[1], aspect);
  const a1 = Math.atan2(py - vy, px - vx);
  const a2 = Math.atan2(qy - vy, qx - vx);
  let sweep = a2 - a1;
  while (sweep > Math.PI) sweep -= Math.PI * 2;
  while (sweep < -Math.PI) sweep += Math.PI * 2;
  const sx = vx + Math.cos(a1) * ARC_R;
  const sy = vy + Math.sin(a1) * ARC_R;
  const ex = vx + Math.cos(a1 + sweep) * ARC_R;
  const ey = vy + Math.sin(a1 + sweep) * ARC_R;
  return `M ${sx} ${sy} A ${ARC_R} ${ARC_R} 0 0 ${sweep > 0 ? 1 : 0} ${ex} ${ey}`;
}

type Props = {
  /** The pose drawn solid. Null draws only the ghost. */
  pose: Pose | null;
  /** clip.h / clip.w. */
  aspect: number;
  bounds: FigureBounds;
  /** A second pose drawn dashed and faint behind the figure, such as a target. */
  ghost?: Pose;
  /** Landmarks circled in accent. */
  highlight?: number[];
  /** Landmark whose angle gets an arc between its two bones. */
  arcAt?: number;
  className?: string;
  /** Extra SVG content, in the same units as the figure. */
  children?: ReactNode;
};

/**
 * A skeleton drawn on the page, without video, in theme colors. Decorative: the parent names it.
 * Strokes keep their width in screen pixels however large the figure is drawn.
 */
export function PoseFigure({ pose, aspect, bounds, ghost, highlight = [], arcAt, className = "", children }: Props) {
  const arc = pose && arcAt !== undefined ? arcPath(pose, arcAt, aspect) : null;
  return (
    <svg
      viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
      className={`block overflow-visible ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {ghost && (
        <g
          className="fill-none stroke-muted opacity-50"
          strokeWidth={2}
          strokeDasharray="6 6"
          strokeLinecap="round"
          data-figure-ghost
        >
          <Bones pose={ghost} aspect={aspect} />
        </g>
      )}
      {pose && (
        <>
          <g className="fill-none stroke-accent" strokeWidth={3} strokeLinecap="round" data-figure-bones>
            <Bones pose={pose} aspect={aspect} />
          </g>
          {arc && <path d={arc} className="fill-none stroke-text" strokeWidth={1.5} vectorEffect={NS} />}
          {highlight
            .filter((id) => pose[id])
            .map((id) => {
              const [x, y] = toSvg(pose, id, aspect);
              return <circle key={`ring-${id}`} cx={x} cy={y} r={RING_R} className="fill-none stroke-accent" strokeWidth={2} vectorEffect={NS} />;
            })}
          <g className="fill-bg stroke-text" strokeWidth={1.5}>
            {JOINTS.filter((id) => pose[id]).map((id) => {
              const [x, y] = toSvg(pose, id, aspect);
              return <circle key={id} cx={x} cy={y} r={JOINT_R} vectorEffect={NS} />;
            })}
          </g>
        </>
      )}
      {children}
    </svg>
  );
}
