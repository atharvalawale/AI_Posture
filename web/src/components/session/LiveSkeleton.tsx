"use client";

import { type RefObject, useEffect, useRef } from "react";
import { drawBones } from "@/lib/pose";
import { glide, GLIDE_MS, lineWidth, type Pose, type PoseFeed, toElement, videoBox, visiblePose } from "@/lib/session/skeleton";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  feed: PoseFeed;
  /** True when the video is mirrored (the front camera), so the skeleton mirrors with it. */
  mirrored: boolean;
};

/**
 * Draws the server's pose over the live camera, in the demo skeleton's style. The canvas covers
 * the video element exactly and maps the frame with the video's own object-fit, so it lines up
 * whether the video is cropped (phones) or letterboxed (desktop). Each new pose glides in over
 * one frame interval with requestAnimationFrame, and the loop stops once it arrives, so nothing
 * runs while the pose holds still. Reduced motion draws each pose as it comes. React never
 * re-renders for a frame: the feed is read directly.
 */
export function LiveSkeleton({ videoRef, feed, mirrored }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !video || !ctx) return;

    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let from: Pose | null = null;
    let to = visiblePose(feed.get());
    let start = 0;
    let raf = 0;
    let fit: "cover" | "contain" = "cover";

    const shownAt = (now: number) => (motion?.matches ? to : glide(from, to, (now - start) / GLIDE_MS));

    const paint = (pose: Pose | null) => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!pose || !w || !h || !video.videoWidth || !video.videoHeight) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const box = videoBox(w, h, video.videoWidth, video.videoHeight, fit, mirrored);
      drawBones(
        ctx,
        (k) => {
          const p = pose[k];
          return p ? toElement(box, p[0], p[1]) : null;
        },
        lineWidth(box),
      );
    };

    const tick = (now: number) => {
      raf = 0;
      paint(shownAt(now));
      if (to && from && !motion?.matches && now - start < GLIDE_MS) raf = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onPose = () => {
      const now = performance.now();
      // Start from where the skeleton is on screen, so a pose that lands mid-glide does not jump.
      from = shownAt(now);
      to = visiblePose(feed.get());
      start = now;
      schedule();
    };

    // The fit changes at the lg breakpoint, and every resize can cross it.
    const relayout = () => {
      fit = getComputedStyle(video).objectFit === "contain" ? "contain" : "cover";
      schedule();
    };

    // A zoom or a move to another screen changes the pixel ratio without always resizing the page.
    let dprQuery: MediaQueryList | undefined;
    const watchDpr = () => {
      dprQuery?.removeEventListener("change", onDpr);
      dprQuery = window.matchMedia?.(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      dprQuery?.addEventListener("change", onDpr);
    };
    function onDpr() {
      watchDpr();
      schedule();
    }

    const unsubscribe = feed.subscribe(onPose);
    // Rotating a phone resizes the element and swaps the camera's width and height.
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(relayout) : undefined;
    resize?.observe(canvas);
    video.addEventListener("resize", relayout);
    video.addEventListener("loadedmetadata", relayout);
    window.addEventListener("resize", relayout);
    watchDpr();
    relayout();

    return () => {
      unsubscribe();
      resize?.disconnect();
      video.removeEventListener("resize", relayout);
      video.removeEventListener("loadedmetadata", relayout);
      window.removeEventListener("resize", relayout);
      dprQuery?.removeEventListener("change", onDpr);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [videoRef, feed, mirrored]);

  return <canvas ref={canvasRef} aria-hidden="true" data-live-skeleton="" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
