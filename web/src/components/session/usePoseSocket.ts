"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import {
  encodeFrame,
  FRAME_INTERVAL_MS,
  isServerError,
  JPEG_QUALITY,
  MAX_RETRIES,
  parseServerMessage,
  retryDelayMs,
} from "@/lib/session/protocol";
import type { SessionAction } from "@/lib/session/reducer";
import { PoseFeed } from "@/lib/session/skeleton";

type Options = {
  /** Connect while true. Turning it false closes the socket and stops sending. */
  active: boolean;
  url: string;
  /** Bump to start over after the final failure. */
  run: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  dispatch: (action: SessionAction) => void;
};

/**
 * Streams camera frames to the pose backend and feeds its messages to the reducer. Frames are
 * drawn straight from the video element, so they are never mirrored, even with the front camera.
 * Retries up to MAX_RETRIES times with attempt x 3 s delays. Everything stops in the cleanup,
 * which also runs when the route is hidden by Activity.
 * Returns the feed of the latest keypoints for the skeleton. It empties while there is no live
 * connection, so a stale pose never stays on screen.
 */
export function usePoseSocket({ active, url, run, videoRef, dispatch }: Options): PoseFeed {
  const [feed] = useState(() => new PoseFeed());
  const dispatchRef = useRef(dispatch);
  useEffect(() => {
    dispatchRef.current = dispatch;
  });

  useEffect(() => {
    if (!active) return;
    const send = (action: SessionAction) => dispatchRef.current(action);

    let disposed = false;
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let frameTimer: ReturnType<typeof setInterval> | undefined;
    let attempt = 0;
    // True once the server has answered. Only then do retries count from zero again, so a server
    // that accepts and drops every connection still ends in the final error.
    let healthy = false;
    let finished = false;
    let encoding = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    function stopFrames() {
      clearInterval(frameTimer);
      frameTimer = undefined;
    }

    function sendFrame(socket: WebSocket) {
      const video = videoRef.current;
      if (!ctx || !video || encoding || socket.readyState !== WebSocket.OPEN) return;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) return;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      encoding = true;
      canvas.toBlob(
        (blob) => {
          if (!blob || disposed || socket.readyState !== WebSocket.OPEN) {
            encoding = false;
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            encoding = false;
            if (disposed || socket.readyState !== WebSocket.OPEN || typeof reader.result !== "string") return;
            socket.send(encodeFrame(reader.result.split(",")[1] ?? ""));
          };
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    }

    function connect() {
      if (disposed) return;
      const socket = new WebSocket(url);
      ws = socket;
      socket.onopen = () => {
        if (disposed) return;
        send({ type: "open" });
        stopFrames();
        frameTimer = setInterval(() => sendFrame(socket), FRAME_INTERVAL_MS);
      };
      socket.onmessage = (event) => {
        if (disposed) return;
        attempt = 0;
        healthy = true;
        const message = parseServerMessage(event.data);
        if (!message) return;
        // The server closes the socket right after the complete message. That close is expected.
        if ("complete" in message && message.complete) finished = true;
        if (!isServerError(message)) feed.set(message.keypoints ?? null);
        send({ type: "message", message });
      };
      // An error is always followed by close, so retries are handled in one place.
      socket.onclose = () => {
        stopFrames();
        if (ws === socket) feed.set(null);
        if (disposed || finished || ws !== socket) return;
        if (attempt < MAX_RETRIES) {
          attempt += 1;
          send({ type: "closed", attempt, reconnect: healthy });
          retryTimer = setTimeout(connect, retryDelayMs(attempt));
        } else {
          send({ type: "failed" });
        }
      };
    }

    connect();

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      stopFrames();
      feed.set(null);
      if (ws) {
        ws.onopen = ws.onmessage = ws.onclose = null;
        if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) ws.close();
        ws = null;
      }
    };
  }, [active, url, run, videoRef, feed]);

  return feed;
}
