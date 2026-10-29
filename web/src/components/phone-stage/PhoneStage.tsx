"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Component, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { PHONE_H, PHONE_W, type ScreenId } from "@/components/phone/PhoneFrame";
import { canUse3D, readDeviceEnv } from "@/lib/device";
import { Phone2DStage } from "./Phone2DStage";
import { useScrollStory } from "./useScrollStory";

const Phone3D = dynamic(() => import("./Phone3D"), { ssr: false, loading: () => null });

export type StageNote = { title: string; body: string; screen: ScreenId };

const noop = () => () => {};
const DESKTOP = "(min-width: 1024px)";
const REDUCED = "(prefers-reduced-motion: reduce)";

function useMedia(query: string, server: boolean) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => server,
  );
}

/** Falls back to the 2D phone if WebGL fails at runtime (lost context, driver bug). */
class Fallback extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Phone width that fits the pinned frame's height, leaving room for the notes on small screens. */
function usePhoneWidth(frame: RefObject<HTMLDivElement | null>, desktop: boolean, still: boolean) {
  const [fitted, setFitted] = useState(PHONE_W);
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el || still) return;
    // ResizeObserver reports the initial size too, so this also runs once on mount.
    const ro = new ResizeObserver(() => {
      const reserved = desktop ? 72 : 196;
      const h = el.clientHeight - reserved;
      setFitted(Math.round(Math.max(200, Math.min(PHONE_W, (h * PHONE_W) / PHONE_H))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [frame, desktop, still]);
  if (still) return desktop ? PHONE_W : 280;
  return fitted;
}

/** `on`: the note is about the screen on show. `marked`: draw the accent rule (only during the story). */
function Note({ note, on, marked = on, align = "left" }: { note: StageNote; on: boolean; marked?: boolean; align?: "left" | "right" }) {
  return (
    <div className={`border-t py-[18px] transition-colors duration-300 ${marked ? "border-accent" : "border-line"} ${align === "right" ? "text-right" : ""}`}>
      <h3 className={`text-base font-semibold transition-colors duration-300 ${on ? "text-text" : "text-muted"}`}>{note.title}</h3>
      <p className="mt-1 text-sm leading-normal text-muted">{note.body}</p>
    </div>
  );
}

/**
 * The phone below the hero: pins while the visitor scrolls and walks through the live session,
 * the session summary and today's plan. The notes for the screen on show are highlighted.
 * Uses the 3D phone when the device can take it, and the 2D phone otherwise (and while the 3D
 * code loads). With reduced motion: no pin, no tilt, the phone face-on with all notes.
 */
export function PhoneStage({ notes }: { notes: StageNote[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const { progress, screen } = useScrollStory(sectionRef);
  const reduced = useMedia(REDUCED, false);
  const desktop = useMedia(DESKTOP, true);
  const can3D = useSyncExternalStore(noop, () => canUse3D(readDeviceEnv()), () => false);
  const { resolvedTheme } = useTheme();
  const [ready3D, setReady3D] = useState(false);
  const [failed3D, setFailed3D] = useState(false);
  const width = usePhoneWidth(frameRef, desktop, reduced);
  const use3D = can3D && !failed3D && !reduced;

  const left = notes.slice(0, 2);
  const right = notes.slice(2);
  const on = (n: StageNote) => reduced || n.screen === screen;
  const groups = (["live", "summary", "plan"] as const).map((id) => ({ id, notes: notes.filter((n) => n.screen === id) }));

  return (
    <section ref={sectionRef} data-phone-stage aria-label="The FiixBE app, screen by screen" className="relative bg-bg">
      <h2 className="sr-only">The FiixBE app</h2>
      <div ref={frameRef} className={reduced ? "py-12 lg:py-16" : "h-[calc(100svh-64px)] min-h-[600px]"}>
        <div className="mx-auto grid h-full w-full max-w-[1200px] items-center gap-x-14 px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-10">
          <div className="hidden lg:block">
            {left.map((n, i) => (
              <div key={n.title} className={i === left.length - 1 ? "border-b border-line" : ""}>
                <Note note={n} on={on(n)} marked={!reduced && on(n)} align="right" />
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="relative" style={{ width, height: (width * PHONE_H) / PHONE_W }}>
              {use3D && (
                <div data-phone="3d" data-ready={ready3D} className={`absolute inset-0 transition-opacity duration-300 ${ready3D ? "opacity-100" : "opacity-0"}`}>
                  <Fallback onError={() => setFailed3D(true)}>
                    <Phone3D progress={progress} screen={screen} phoneWidth={width} dark={resolvedTheme === "dark"} onReady={() => setReady3D(true)} />
                  </Fallback>
                </div>
              )}
              {!(use3D && ready3D) && (
                <div className="absolute inset-0">
                  <Phone2DStage progress={progress} screen={screen} width={width} still={reduced} />
                </div>
              )}
            </div>

            {/* Small screens: the notes for the screen on show, under the phone. */}
            {reduced ? (
              <div className="mt-8 w-full max-w-md border-b border-line lg:hidden">
                {notes.map((n) => (
                  <Note key={n.title} note={n} on marked={false} />
                ))}
              </div>
            ) : (
              <div className="mt-6 grid w-full max-w-md lg:hidden">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    aria-hidden={g.id !== screen}
                    className={`col-start-1 row-start-1 transition-[opacity,visibility] duration-300 ${g.id === screen ? "visible opacity-100" : "invisible opacity-0"}`}
                  >
                    {g.notes.map((n) => (
                      <MobileNote key={n.title} note={n} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            {right.map((n, i) => (
              <div key={n.title} className={i === right.length - 1 ? "border-b border-line" : ""}>
                <Note note={n} on={on(n)} marked={!reduced && on(n)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MobileNote({ note }: { note: StageNote }) {
  return (
    <div className="py-2 text-center">
      <h3 className="text-base font-semibold">{note.title}</h3>
      <p className="mt-0.5 text-sm leading-normal text-muted">{note.body}</p>
    </div>
  );
}
