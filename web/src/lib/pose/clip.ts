/**
 * A pose clip is MediaPipe pose landmarker output for one video, compacted:
 * `k` lists the MediaPipe landmark ids kept, `p` holds `[x, y]` per landmark per sample,
 * flattened, in thousandths of the video width and height. One sample every `step` frames.
 */
export type PoseClip = { fps: number; step: number; w: number; h: number; k: number[]; n: number; p: number[] };

/** MediaPipe landmark ids kept in a clip: nose, shoulders, elbows, wrists, hips, knees, ankles, toes. */
export const LANDMARKS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32];

/** Bones drawn on the skeleton. */
export const EDGES: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 31],
  [28, 32],
];

/** Landmarks drawn as joints. */
export const JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

/** Length of the clip in seconds (time of the last sample). */
export function clipDuration(clip: PoseClip): number {
  return ((clip.n - 1) * clip.step) / clip.fps;
}

/**
 * Landmark position at time `t` (seconds), normalized 0..1 to the video frame.
 * Linearly interpolates between samples and clamps to the first and last sample.
 */
export function keypoint(clip: PoseClip, t: number, landmark: number): [number, number] {
  const slot = clip.k.indexOf(landmark);
  if (slot < 0) throw new Error(`Landmark ${landmark} is not in this pose clip`);
  const f = Math.max(0, (t * clip.fps) / clip.step);
  const i = Math.min(Math.floor(f), clip.n - 1);
  const j = Math.min(i + 1, clip.n - 1);
  const a = i === j ? 0 : f - i;
  const stride = clip.k.length * 2;
  const pi = i * stride + slot * 2;
  const pj = j * stride + slot * 2;
  return [(clip.p[pi] * (1 - a) + clip.p[pj] * a) / 1000, (clip.p[pi + 1] * (1 - a) + clip.p[pj + 1] * a) / 1000];
}

const cache = new Map<string, Promise<PoseClip>>();

/** Fetches a pose clip once per URL. */
export function loadPoseClip(url = "/media/squat.pose.json"): Promise<PoseClip> {
  let clip = cache.get(url);
  if (!clip) {
    clip = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`Could not load pose clip ${url}: ${res.status}`);
      return res.json() as Promise<PoseClip>;
    });
    // Let a failed load be retried later.
    clip.catch(() => cache.delete(url));
    cache.set(url, clip);
  }
  return clip;
}
