import { EDGES, JOINTS, keypoint, type PoseClip } from "./clip";
import type { Box } from "./geometry";
import { MEASURES, type JointId } from "./measures";

// Fixed in both themes: the video decides legibility, not the page.
const LINE = "#5ED6C6";
const OUTLINE = "rgba(6,20,22,.45)";
const JOINT = "#FFFFFF";
const RING = "#0B5E57";

/**
 * Draws the skeleton for time `t` into `ctx`, with the video frame mapped to `box`
 * (see `coverBox`). Coordinates are in the context's current units, so callers set
 * the device pixel ratio transform and clear the canvas themselves.
 * `arc` adds a thin arc at that joint's vertex (see `MEASURES`): between thigh and shin for the knee,
 * trunk and thigh for the hip, and trunk and the vertical for the back.
 */
export function drawSkeleton(ctx: CanvasRenderingContext2D, clip: PoseClip, t: number, box: Box, opts: { arc?: JointId } = {}): void {
  const at = (k: number): [number, number] => {
    const p = keypoint(clip, t, k);
    return [box.ox + p[0] * box.w, box.oy + p[1] * box.h];
  };
  const lw = Math.max(2, box.w / 160);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [color, width] of [
    [OUTLINE, lw + 2.5],
    [LINE, lw],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const [a, b] of EDGES) {
      const pa = at(a);
      const pb = at(b);
      ctx.moveTo(pa[0], pa[1]);
      ctx.lineTo(pb[0], pb[1]);
    }
    ctx.stroke();
  }

  for (const k of JOINTS) {
    const [x, y] = at(k);
    ctx.beginPath();
    ctx.arc(x, y, lw * 1.35, 0, Math.PI * 2);
    ctx.fillStyle = JOINT;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = RING;
    ctx.stroke();
  }

  if (opts.arc) {
    const vertex = MEASURES[opts.arc].vertex;
    const [vx, vy] = at(vertex);
    // The two rays of the angle. The back measures lean from the vertical, so one ray points straight down.
    const [px, py] = opts.arc === "knee" ? at(23) : opts.arc === "hip" ? at(11) : at(23);
    const [qx, qy] = opts.arc === "knee" ? at(27) : opts.arc === "hip" ? at(25) : [vx, vy + 1];
    let a1 = Math.atan2(py - vy, px - vx);
    let a2 = Math.atan2(qy - vy, qx - vx);
    // Draw the inner (smaller) arc between the two rays.
    if (a2 < a1) [a1, a2] = [a2, a1];
    const anticlockwise = a2 - a1 > Math.PI;
    ctx.beginPath();
    ctx.arc(vx, vy, lw * 7, a1, a2, anticlockwise);
    ctx.strokeStyle = JOINT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
