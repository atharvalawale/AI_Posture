"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent } from "react";
import { dragAngles, leanToward, NO_LEAN, release, REST, settle, step, type Lean, type SpinState } from "./spin";

export type Spin = {
  /** The current extra rotation. Read it every frame; changes do not re-render. */
  state: MutableRefObject<SpinState>;
  /** Calls `fn` whenever the rotation changes. Returns the unsubscribe function. */
  subscribe: (fn: () => void) => () => void;
  /** Pointer handlers for the element the visitor drags. */
  handlers: {
    onPointerDown: (e: PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: PointerEvent<HTMLElement>) => void;
    onPointerCancel: (e: PointerEvent<HTMLElement>) => void;
    onPointerLeave: (e: PointerEvent<HTMLElement>) => void;
  };
  dragging: boolean;
  /** The visitor has turned the phone at least once. */
  turned: boolean;
};

type Drag = {
  id: number;
  x0: number;
  y0: number;
  from: { x: number; y: number };
  /** When the pointer went down, and the farthest it has moved since, in CSS pixels. */
  t0: number;
  moved: number;
  t: number;
  lastX: number;
  lastY: number;
};

/** A press shorter and smaller than this is a tap, not a drag. */
const TAP = { ms: 350, px: 6 };

/**
 * Lets the visitor turn the phone: drag to rotate, flick to spin, hover to make it lean toward
 * the pointer. `maxYaw` limits the turn (the 2D phone has no back to show); pass Infinity for
 * the 3D phone. A tap calls `onTap`. Does nothing while `enabled` is false (reduced motion).
 */
export function useSpin({ enabled, maxYaw, width, onTap }: { enabled: boolean; maxYaw: number; width: number; onTap?: () => void }): Spin {
  const state = useRef<SpinState>(REST);
  const lean = useRef<Lean>(NO_LEAN);
  const drag = useRef<Drag | null>(null);
  const listeners = useRef(new Set<() => void>());
  const raf = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [turned, setTurned] = useState(false);
  const tap = useRef(onTap);
  useEffect(() => {
    tap.current = onTap;
  }, [onTap]);

  const notify = useCallback(() => listeners.current.forEach((fn) => fn()), []);

  // Runs the spring until the phone rests, one step per animation frame.
  const animate = useCallback(() => {
    if (raf.current) return;
    let last = performance.now();
    const tick = (now: number) => {
      raf.current = 0;
      if (drag.current) return;
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

  // Back to rest when turning is switched off.
  useEffect(() => {
    if (enabled) return;
    drag.current = null;
    lean.current = NO_LEAN;
    state.current = REST;
    notify();
  }, [enabled, notify]);

  const handlers = useMemo<Spin["handlers"]>(() => {
    const end = (e: PointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      drag.current = null;
      setDragging(false);
      if (e.type === "pointerup" && d.moved < TAP.px && performance.now() - d.t0 < TAP.ms) tap.current?.();
      // A pointer that stopped before letting go has no flick left in it.
      const stale = performance.now() - d.t > 80;
      state.current = release(stale ? { ...state.current, vx: 0, vy: 0 } : state.current, maxYaw);
      if (e.pointerType !== "mouse") lean.current = NO_LEAN;
      animate();
    };

    return {
      onPointerDown: (e) => {
        if (!enabled || drag.current || (e.pointerType === "mouse" && e.button !== 0)) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const { x, y } = state.current;
        const now = performance.now();
        drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, from: { x, y }, t0: now, moved: 0, t: now, lastX: x, lastY: y };
        setDragging(true);
      },
      onPointerMove: (e) => {
        if (!enabled) return;
        const d = drag.current;
        if (!d) {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          lean.current = leanToward((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
          animate();
          return;
        }
        if (d.id !== e.pointerId) return;
        const now = performance.now();
        const dt = Math.max(1, now - d.t) / 1000;
        const a = dragAngles(d.from, e.clientX - d.x0, e.clientY - d.y0, width, maxYaw);
        // Smoothed velocity, so one jittery event does not decide the flick.
        const s = state.current;
        const vx = s.vx * 0.6 + ((a.x - d.lastX) / dt) * 0.4;
        const vy = s.vy * 0.6 + ((a.y - d.lastY) / dt) * 0.4;
        state.current = { ...s, x: a.x, y: a.y, vx, vy };
        const moved = Math.max(d.moved, Math.hypot(e.clientX - d.x0, e.clientY - d.y0));
        drag.current = { ...d, moved, t: now, lastX: a.x, lastY: a.y };
        if (moved > TAP.px) setTurned(true);
        notify();
      },
      onPointerUp: end,
      onPointerCancel: end,
      onPointerLeave: (e) => {
        if (e.pointerType !== "mouse" || drag.current) return;
        lean.current = NO_LEAN;
        animate();
      },
    };
  }, [enabled, maxYaw, width, animate, notify]);

  const subscribe = useCallback((fn: () => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  return { state, subscribe, handlers, dragging, turned };
}
