"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { LiveSession, coverBox, drawSkeleton, loadPoseClip, type LiveState, type PoseClip } from "@/lib/pose";

export type PoseVideoState = LiveState & { playing: boolean };

const loaded = new WeakMap<LiveSession, PoseClip>();

type Options = {
  /** False pauses the video and stops drawing (for example while another screen shows). */
  active?: boolean;
  /** The video's object-position as fractions, so the skeleton lines up with `object-fit: cover`. */
  position?: [number, number];
  url?: string;
  /** The session that owns time, joint, reps and form. Without one the hook makes its own. */
  session?: LiveSession;
};

/**
 * Plays a muted looping clip and draws its pose skeleton on a canvas laid over it.
 * Uses the media time of the frame on screen (requestVideoFrameCallback, with a
 * currentTime fallback) so the skeleton never runs ahead of the picture. Draws nothing
 * until the video has actually started (or been seeked), so a blocked autoplay just shows the poster.
 * Every drawn frame is fed to the session, and the arc follows the session's selected joint.
 */
export function usePoseVideo(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  { active = true, position = [0.5, 0.5], url, session }: Options = {},
): PoseVideoState {
  const [own] = useState(() => new LiveSession());
  const live = session ?? own;
  const state = useSyncExternalStore(live.subscribe, live.getSnapshot, live.getSnapshot);
  const [playing, setPlaying] = useState(false);
  const [posX, posY] = position;

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!video || !canvas || !ctx) return;

    let clip: PoseClip | null = null;
    let started = false;
    let visible = true;
    let disposed = false;
    let raf = 0;
    let vfc = 0;
    let shown = 0;
    let drawn = { t: -1, w: 0, h: 0, dpr: 0, joint: "" };
    const detach = live.attach(video);
    const hasFrameCallback = typeof video.requestVideoFrameCallback === "function";
    const raf$ = window.requestAnimationFrame?.bind(window) ?? ((cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 16));
    const caf$ = window.cancelAnimationFrame?.bind(window) ?? window.clearTimeout;

    loadPoseClip(url)
      .then((c) => {
        clip = c;
        // Setting the clip restarts the count, so do it once per session, not on every effect run.
        if (!disposed && loaded.get(live) !== c) {
          loaded.set(live, c);
          live.setClip(c);
        }
      })
      .catch(() => {
        // No skeleton without pose data. The video still plays.
      });

    const clear = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const paint = (t: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      if (started && clip && w && h) {
        if (t !== drawn.t) live.frame(t, video);
        const { joint } = live.getSnapshot();
        if (t !== drawn.t || w !== drawn.w || h !== drawn.h || dpr !== drawn.dpr || joint !== drawn.joint) {
          drawn = { t, w, h, dpr, joint };
          clear();
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawSkeleton(ctx, clip, t, coverBox(w, h, clip.w, clip.h, posX, posY), { arc: joint });
        }
      } else if (t !== drawn.t || w !== drawn.w || h !== drawn.h || dpr !== drawn.dpr) {
        drawn = { t, w, h, dpr, joint: "" };
        clear();
      }
    };

    const tick = () => {
      raf = 0;
      if (disposed || !running()) return;
      paint(hasFrameCallback ? shown : video.currentTime);
      raf = raf$(tick);
    };

    const running = () => active && visible;
    const start = () => {
      if (!raf) raf = raf$(tick);
      if (running() && video.paused) {
        video.play().catch(() => {
          // Autoplay blocked (for example iOS Low Power Mode). The poster stays up.
        });
      }
    };
    const stop = () => {
      if (raf) caf$(raf);
      raf = 0;
      video.pause();
    };

    const onFrame: VideoFrameRequestCallback = (_, meta) => {
      shown = meta.mediaTime;
      vfc = video.requestVideoFrameCallback(onFrame);
    };
    if (hasFrameCallback) vfc = video.requestVideoFrameCallback(onFrame);

    const onPlaying = () => {
      started = true;
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    // A seek while paused (scrubbing, stepping) shows a new frame the loop may not see, so draw it now.
    const onSeeked = () => {
      started = true;
      shown = video.currentTime;
      if (!disposed && running()) paint(shown);
    };
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onSeeked);

    // Pause off screen: saves battery on phones and keeps the main thread free while scrolling.
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (running()) start();
        else stop();
      });
      io.observe(video);
    }

    // React does not reflect `muted` as an attribute, and autoplay needs it.
    video.muted = true;
    clear();
    if (running()) start();
    else video.pause();

    return () => {
      disposed = true;
      io?.disconnect();
      detach();
      if (raf) caf$(raf);
      if (vfc) video.cancelVideoFrameCallback(vfc);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onSeeked);
      video.pause();
    };
  }, [videoRef, canvasRef, active, posX, posY, url, live]);

  return { ...state, playing };
}
