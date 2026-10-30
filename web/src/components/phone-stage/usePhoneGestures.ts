"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent } from "react";
import { isTap, TAP } from "./gestures";
import { leanToward, NO_LEAN, REST, settle, step, type Lean, type SpinState } from "./spin";

export type PhoneLean = {
  /** The current lean. Read it every frame; changes do not re-render. */
  state: MutableRefObject<SpinState>;
  /** Calls `fn` whenever the lean changes. Returns the unsubscribe function. */
  subscribe: (fn: () => void) => () => void;
};

export type PhoneGestures = {
  lean: PhoneLean;
  /** Pointer handlers for the element over the phone. */
  handlers: {
    onPointerDown: (e: PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: PointerEvent<HTMLElement>) => void;
    onPointerLeave: (e: PointerEvent<HTMLElement>) => void;
  };
  /** A scrub is in progress. */
  dragging: boolean;
  /** The visitor has scrubbed at least once. */
  scrubbed: boolean;
};

type Press = { id: number; x0: number; y0: number; t0: number; moved: number; scrubbing: boolean };

type Options = {
  /** Switches the cursor lean off (reduced motion). Scrub and tap always work. */
  enabled: boolean;
  onScrubStart?: () => void;
  /** Horizontal distance from the press point, in CSS pixels. */
  onScrub?: (dxPx: number) => void;
  onScrubEnd?: () => void;
  /** Fractions (0..1) over the element the handlers sit on. */
  onTap?: (px: number, py: number) => void;
};

/**
 * What the visitor can do to the phone: drag sideways to scrub the clip, tap to pick a point,
 * and with a mouse, hover to make it lean toward the pointer. The phone never turns.
 */
export function usePhoneGestures({ enabled, onScrubStart, onScrub, onScrubEnd, onTap }: Options): PhoneGestures {
  const state = useRef<SpinState>(REST);
  const lean = useRef<Lean>(NO_LEAN);
  const press = useRef<Press | null>(null);
  const listeners = useRef(new Set<() => void>());
  const raf = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [scrubbed, setScrubbed] = useState(false);
  const callbacks = useRef({ onScrubStart, onScrub, onScrubEnd, onTap });
  useEffect(() => {
    callbacks.current = { onScrubStart, onScrub, onScrubEnd, onTap };
  }, [onScrubStart, onScrub, onScrubEnd, onTap]);

  const notify = useCallback(() => listeners.current.forEach((fn) => fn()), []);

  // Runs the spring until the phone rests, one step per animation frame.
  const animate = useCallback(() => {
    if (raf.current) return;
    let last = performance.now();
    const tick = (now: number) => {
      raf.current = 0;
      const s = step(state.current, lean.current, (now - last) / 1000);
      last = now;
      const rested = settle(s, lean.current);
      state.current = rested ?? s;
      notify();
      if (!rested) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [notify]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Back to rest when the lean is switched off.
  useEffect(() => {
    if (enabled) return;
    lean.current = NO_LEAN;
    state.current = REST;
    notify();
  }, [enabled, notify]);

  const handlers = useMemo<PhoneGestures["handlers"]>(() => {
    const end = (e: PointerEvent<HTMLElement>) => {
      const p = press.current;
      if (!p || p.id !== e.pointerId) return;
      press.current = null;
      if (p.scrubbing) {
        setDragging(false);
        callbacks.current.onScrubEnd?.();
      } else if (e.type === "pointerup" && isTap(p.moved, performance.now() - p.t0)) {
        const r = e.currentTarget.getBoundingClientRect();
        callbacks.current.onTap?.((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      }
      if (e.pointerType !== "mouse" && lean.current !== NO_LEAN) {
        lean.current = NO_LEAN;
        animate();
      }
    };

    return {
      onPointerDown: (e) => {
        if (press.current || (e.pointerType === "mouse" && e.button !== 0)) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        press.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: 0, scrubbing: false };
      },
      onPointerMove: (e) => {
        const p = press.current;
        if (!p) {
          if (!enabled || e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          lean.current = leanToward((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
          animate();
          return;
        }
        if (p.id !== e.pointerId) return;
        const dx = e.clientX - p.x0;
        p.moved = Math.max(p.moved, Math.hypot(dx, e.clientY - p.y0));
        // Only sideways movement scrubs, so a tap, or a vertical swipe that scrolls the page, never pauses the video.
        if (!p.scrubbing && Math.abs(dx) > TAP.px) {
          p.scrubbing = true;
          setDragging(true);
          setScrubbed(true);
          callbacks.current.onScrubStart?.();
        }
        if (p.scrubbing) callbacks.current.onScrub?.(dx);
      },
      onPointerUp: end,
      onPointerCancel: end,
      onPointerLeave: (e) => {
        if (e.pointerType !== "mouse" || press.current) return;
        lean.current = NO_LEAN;
        animate();
      },
    };
  }, [enabled, animate]);

  const subscribe = useCallback((fn: () => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  return { lean: useMemo(() => ({ state, subscribe }), [subscribe]), handlers, dragging, scrubbed };
}
