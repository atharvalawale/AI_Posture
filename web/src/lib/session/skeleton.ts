import { containBox, coverBox, type Box } from "@/lib/pose";
import { FRAME_INTERVAL_MS, type Keypoints } from "./protocol";

/** The scorer ignores landmarks at or below this visibility, so the skeleton does too. */
export const MIN_VISIBILITY = 0.5;

/** Each new pose glides in over one frame interval, so the skeleton moves smoothly at 5 frames a second. */
export const GLIDE_MS = FRAME_INTERVAL_MS;

/** Landmark positions normalized 0..1 to the video frame, by MediaPipe index. Null where unknown. */
export type Pose = ([number, number] | null)[];

/**
 * Where the video frame lands in its element (`Box`), the element's size, and whether the
 * element is mirrored (the front camera preview).
 */
export type VideoBox = Box & { width: number; height: number; mirrored: boolean };

/**
 * Lays a `mediaW` x `mediaH` video into a `width` x `height` element shown with `object-fit`
 * `fit` and the default centered `object-position`.
 */
export function videoBox(width: number, height: number, mediaW: number, mediaH: number, fit: "cover" | "contain", mirrored: boolean): VideoBox {
  const box = fit === "contain" ? containBox(width, height, mediaW, mediaH) : coverBox(width, height, mediaW, mediaH);
  return { ...box, width, height, mirrored };
}

/**
 * Maps a point normalized to the video frame into element units. A mirrored element is flipped
 * around its own center, as `transform: scaleX(-1)` does.
 */
export function toElement(box: VideoBox, x: number, y: number): [number, number] {
  const px = box.ox + x * box.w;
  return [box.mirrored ? box.width - px : px, box.oy + y * box.h];
}

/** Line width for the visible part of the frame, like the demos: 1/160 of its size, at least 2. */
export function lineWidth(box: VideoBox): number {
  return Math.max(2, Math.min(box.w, box.width, box.h, box.height) / 160);
}

/** The landmarks to draw: those seen well enough. Null when nobody is in the frame. */
export function visiblePose(keypoints: Keypoints | null | undefined): Pose | null {
  if (!keypoints) return null;
  return keypoints.map((k) => (k && k[2] > MIN_VISIBILITY ? [k[0], k[1]] : null));
}

/**
 * The pose a fraction `a` (0..1) of the way from `from` to `to`. A landmark that was not visible
 * before appears at its new place, and one that is no longer visible disappears.
 */
export function glide(from: Pose | null, to: Pose | null, a: number): Pose | null {
  if (!to || !from || a >= 1) return to;
  const t = Math.max(0, a);
  return to.map((p, i) => {
    const q = from[i];
    return p && q ? [q[0] + (p[0] - q[0]) * t, q[1] + (p[1] - q[1]) * t] : p;
  });
}

/**
 * The latest pose from the server, kept outside React state so a new frame redraws the skeleton
 * without re-rendering the page.
 */
export class PoseFeed {
  private keypoints: Keypoints | null = null;
  private listeners = new Set<() => void>();

  get = (): Keypoints | null => this.keypoints;

  set(keypoints: Keypoints | null): void {
    if (keypoints === null && this.keypoints === null) return;
    this.keypoints = keypoints;
    for (const listener of this.listeners) listener();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}
