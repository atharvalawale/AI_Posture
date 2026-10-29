import { EDGES, JOINTS, keypoint, type PoseClip } from "./clip";
import type { Box } from "./geometry";

// Fixed in both themes: the video decides legibility, not the page.
const LINE = "#5ED6C6";
const OUTLINE = "rgba(6,20,22,.45)";
const JOINT = "#FFFFFF";
const RING = "#0B5E57";

/**
 * Draws the skeleton for time `t` into `ctx`, with the video frame mapped to `box`
 * (see `coverBox`). Coordinates are in the context's current units, so callers set
 * the device pixel ratio transform and clear the canvas themselves.
 * `arcAt: 25` adds a thin arc at the left knee between thigh and shin.
 */
export function drawSkeleton(ctx: CanvasRenderingContext2D, clip: PoseClip, t: number, box: Box, opts: { arcAt?: 25 } = {}): void {
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

  if (opts.arcAt === 25) {
    const [kx, ky] = at(25);
    const [hx, hy] = at(23);
    const [ax, ay] = at(27);
    let a1 = Math.atan2(hy - ky, hx - kx);
    let a2 = Math.atan2(ay - ky, ax - kx);
    // Draw the inner (smaller) arc between thigh and shin.
    if (a2 < a1) [a1, a2] = [a2, a1];
    const anticlockwise = a2 - a1 > Math.PI;
    ctx.beginPath();
    ctx.arc(kx, ky, lw * 7, a1, a2, anticlockwise);
    ctx.strokeStyle = JOINT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
