import { keypoint, type PoseClip } from "./clip";

/** Angle at landmark `b` between `a` and `c`, in degrees. Corrects for the video's aspect ratio. */
export function jointAngle(clip: PoseClip, t: number, a: number, b: number, c: number): number {
  const r = clip.h / clip.w;
  const pa = keypoint(clip, t, a);
  const pb = keypoint(clip, t, b);
  const pc = keypoint(clip, t, c);
  const u = [pa[0] - pb[0], (pa[1] - pb[1]) * r];
  const v = [pc[0] - pb[0], (pc[1] - pb[1]) * r];
  const len = Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]);
  if (len === 0) return 180;
  const cos = Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / len));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Left knee angle: hip (23), knee (25), ankle (27). */
export function kneeAngle(clip: PoseClip, t: number): number {
  return jointAngle(clip, t, 23, 25, 27);
}

export type Box = { ox: number; oy: number; w: number; h: number };

/**
 * Where media of size `mediaW` x `mediaH` lands inside a `boxW` x `boxH` box with
 * `object-fit: cover` and `object-position: posX posY` (0..1).
 */
export function coverBox(boxW: number, boxH: number, mediaW: number, mediaH: number, posX = 0.5, posY = 0.5): Box {
  const scale = Math.max(boxW / mediaW, boxH / mediaH);
  const w = mediaW * scale;
  const h = mediaH * scale;
  return { ox: (boxW - w) * posX, oy: (boxH - h) * posY, w, h };
}
