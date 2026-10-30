"use client";

import { useCallback, useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent, type RefObject } from "react";

type Opts = { autoAdvanceMs?: number; initial?: number; idPrefix?: string };

/** True while the visitor prefers reduced motion. Read after mount so server and first client render agree. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

/** One active item out of `count`, driven by hover, tap, focus, arrow keys and (optionally) a timer that stops once the visitor interacts. */
export function useShowcase(count: number, opts: Opts = {}) {
  const { autoAdvanceMs, initial = 0, idPrefix } = opts;
  const generated = useId();
  const prefix = idPrefix ?? generated;
  const [rawActive, setActive] = useState(initial);
  // Held while the pointer or focus is inside the root. Pauses the timer without counting as a touch.
  const [held, setHeld] = useState(false);
  const active = Math.min(rawActive, Math.max(count - 1, 0));
  const [touched, setTouched] = useState(false);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLElement | null>(null);
  const tabs = useRef<(HTMLElement | null)[]>([]);

  const holdProps = {
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === "mouse") setHeld(true);
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType === "mouse") setHeld(false);
    },
    onFocusCapture: () => setHeld(true),
    onBlurCapture: (e: FocusEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
    },
  };

  const select = useCallback((i: number) => {
    setTouched(true);
    setActive(i);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || autoAdvanceMs === undefined || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [autoAdvanceMs]);

  useEffect(() => {
    if (autoAdvanceMs === undefined || reduced || touched || held || !visible || count < 2) return;
    const id = window.setTimeout(() => setActive((a) => (Math.min(a, count - 1) + 1) % count), autoAdvanceMs);
    return () => window.clearTimeout(id);
  }, [autoAdvanceMs, reduced, touched, held, visible, count, active]);

  const tabId = (i: number) => `${prefix}-tab-${i}`;
  const panelId = (i: number) => `${prefix}-panel-${i}`;

  const tabProps = (i: number) => ({
    role: "tab" as const,
    id: tabId(i),
    "aria-selected": active === i,
    "aria-controls": panelId(i),
    tabIndex: (active === i ? 0 : -1) as 0 | -1,
    onClick: () => select(i),
    onFocus: () => select(i),
    // A real mouse move, not pointerenter: scrolling the page under a still cursor fires enter without any intent.
    onPointerMove: (e: PointerEvent) => {
      if (e.pointerType === "mouse" && i !== active) select(i);
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const to =
        e.key === "ArrowRight" || e.key === "ArrowDown"
          ? (i + 1) % count
          : e.key === "ArrowLeft" || e.key === "ArrowUp"
            ? (i - 1 + count) % count
            : e.key === "Home"
              ? 0
              : e.key === "End"
                ? count - 1
                : null;
      if (to === null) return;
      e.preventDefault();
      select(to);
      tabs.current[to]?.focus();
    },
    ref: (el: HTMLElement | null) => {
      tabs.current[i] = el;
    },
  });

  const panelProps = { role: "tabpanel" as const, id: panelId(active), "aria-labelledby": tabId(active) };

  return { active, select, touched, holdProps, tabProps, panelProps, tabId, panelId, rootRef: rootRef as RefObject<HTMLElement | null> };
}
