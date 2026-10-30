"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import {
  Component,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { HeroCopy } from "@/components/home/HeroCopy";
import { LiveReadout } from "@/components/home/LiveReadout";
import { PHONE_H, PHONE_W, SCREEN_H, SCREEN_W } from "@/components/phone/PhoneFrame";
import { canUse3D, readDeviceEnv } from "@/lib/device";
import { LiveSession, coverBox, loadPoseClip, nearestJoint, type PoseClip } from "@/lib/pose";
import { ChapterRail } from "./ChapterRail";
import { phonePointToScreen } from "./gestures";
import { Phone2DStage } from "./Phone2DStage";
import { useScrollStory } from "./useScrollStory";
import { usePhoneGestures } from "./usePhoneGestures";

const Phone3D = dynamic(() => import("./Phone3D"), { ssr: false, loading: () => null });

const noop = () => () => {};
const WIDE = "(min-width: 640px)";
const REDUCED = "(prefers-reduced-motion: reduce)";
/** How close a tap must land to a joint to pick it, in CSS pixels on screen. */
const TAP_REACH = 48;

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

/**
 * The stage is sized in CSS, so the server renders it at its final size and nothing shifts on load.
 * `--frame-h`: the viewport below the 64 px header, at least 600 px. `--phone-w`: the phone width
 * that leaves `--below-phone` of the frame free under it (the chapter rail and the hint, and on
 * phones the compact readout too), between 160 px and the design width.
 */
const STAGE_VARS = {
  "--frame-h": "max(600px, calc(100svh - 64px))",
  "--phone-w": `clamp(160px, calc((var(--frame-h) - var(--below-phone)) * ${PHONE_W} / ${PHONE_H}), ${PHONE_W}px)`,
} as CSSProperties;

/** The phone's on-screen width in CSS pixels, read from its CSS-sized box. Null until measured. */
function usePhoneWidth(box: RefObject<HTMLDivElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    // ResizeObserver reports the initial size too, so this also runs once on mount.
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [box]);
  return width;
}

/**
 * The homepage hero and the scroll story in one pinned stage: the headline on the left, the
 * phone in the center and the live readout on the right (stacked below 1024 px). One LiveSession
 * drives the phone screen and the readout. Drag the phone to scrub the squat, tap a joint to
 * measure it, or use the arrow keys and Enter. As the visitor scrolls, the phone walks through the
 * live session, the summary and today's plan. Uses the 3D phone when the device can take it, and
 * the 2D phone otherwise (and while the 3D code loads). With reduced motion: no pin, no tilt and no
 * chapter rail, but the same layout, and scrub, tap and keys still work.
 */
export function HomeStage() {
  const sectionRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const { progress, screen, goTo, onProgress } = useScrollStory(sectionRef);
  const story = useMemo(() => ({ progress, onProgress }), [progress, onProgress]);
  const reduced = useMedia(REDUCED, false);
  const wide = useMedia(WIDE, true);
  const can3D = useSyncExternalStore(noop, () => canUse3D(readDeviceEnv()), () => false);
  const { resolvedTheme } = useTheme();
  const [ready3D, setReady3D] = useState(false);
  // The 2D phone stays on top until the 3D one has faded in, so the hand-over never shows a gap.
  const [shown3D, setShown3D] = useState(false);
  useEffect(() => {
    if (!ready3D) return;
    // Matches the 300 ms fade below. transitionend is skipped when a transition is interrupted.
    const id = window.setTimeout(() => setShown3D(true), 350);
    return () => window.clearTimeout(id);
  }, [ready3D]);
  const [failed3D, setFailed3D] = useState(false);
  // The 2D phone's scale and the 3D canvas need the width as a number, so the phone stays
  // transparent until it is measured. The layout around it is already final.
  const fitted = usePhoneWidth(boxRef);
  const width = fitted ?? PHONE_W;
  const use3D = can3D && !failed3D && !reduced;
  // One clock for the turn-in, so the 3D phone takes over from the 2D one mid-turn without restarting it.
  const [introStart] = useState(() => performance.now());

  const [session] = useState(() => new LiveSession());
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const [clip, setClip] = useState<PoseClip | null>(null);
  useEffect(() => {
    let current = true;
    loadPoseClip()
      .then((c) => {
        if (!current) return;
        session.setClip(c);
        setClip(c);
      })
      .catch(() => {
        // No pose data: the clip still plays, there is just nothing to measure.
      });
    return () => {
      current = false;
    };
  }, [session]);
  useEffect(() => () => session.dispose(), [session]);

  // Scrub, tap and keys only make sense on the live screen.
  const live = screen === "live";
  const scrubbing = useRef(false);
  const [tapped, setTapped] = useState(false);
  const onScrubStart = useCallback(() => {
    if (!live) return;
    scrubbing.current = true;
    session.beginScrub();
  }, [live, session]);
  const onScrub = useCallback(
    (dx: number) => {
      if (scrubbing.current) session.scrubTo(dx, width);
    },
    [session, width],
  );
  const onScrubEnd = useCallback(() => {
    if (!scrubbing.current) return;
    scrubbing.current = false;
    session.endScrub();
  }, [session]);
  const onTap = useCallback(
    (px: number, py: number) => {
      if (!live || !clip) return;
      const p = phonePointToScreen(px, py);
      const box = coverBox(SCREEN_W, SCREEN_H, clip.w, clip.h);
      // The screen is laid out at design size and scaled to `width`, so the reach scales the other way.
      const joint = nearestJoint(clip, session.getSnapshot().t, box, p.x, p.y, (TAP_REACH * PHONE_W) / width);
      if (!joint) return;
      session.setJoint(joint);
      setTapped(true);
    },
    [live, clip, session, width],
  );
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!live) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      session.step(e.key === "ArrowLeft" ? -1 : 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      session.cycleJoint();
    }
  };
  const gestures = usePhoneGestures({ enabled: !reduced, onScrubStart, onScrub, onScrubEnd, onTap });
  const { lean } = gestures;

  return (
    // GSAP wraps the pinned section in a pin spacer. This wrapper stays a child of <main>, so React
    // can still insert sibling nodes before it (as it does on client navigation between routes).
    <div>
      <section
        ref={sectionRef}
        data-phone-stage
        aria-labelledby="hero-title"
        className="relative bg-bg [--below-phone:430px] sm:[--below-phone:164px]"
        style={STAGE_VARS}
      >
        {/* On desktop the whole grid is the stage frame. Below 1024 px the copy sits above the frame. */}
        <div
          className="mx-auto grid w-full max-w-[1200px] px-6 lg:h-(--frame-h) lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-x-8 lg:px-10"
        >
          <HeroCopy className="pt-12 sm:pt-16 lg:pt-0" />

          {/* Below 1024 px the phone and the readout share this frame, which grows if they need more room. On desktop it dissolves into the grid. */}
          <div
            className="flex min-h-(--frame-h) flex-col items-center justify-center gap-7 py-10 sm:flex-row sm:gap-12 lg:contents"
          >
            <div
              className={`flex flex-col items-center transition-opacity duration-500 motion-reduce:transition-none ${fitted === null ? "opacity-0" : "opacity-100"}`}
            >
              <div ref={boxRef} className="relative w-(--phone-w)" style={{ aspectRatio: `${PHONE_W} / ${PHONE_H}` }}>
                {use3D && (
                  <div
                    data-phone="3d"
                    data-ready={ready3D}
                    className={`absolute inset-0 transition-opacity duration-300 ${ready3D ? "opacity-100" : "opacity-0"}`}
                  >
                    <Fallback onError={() => setFailed3D(true)}>
                      <Phone3D
                        progress={progress}
                        screen={screen}
                        session={session}
                        story={story}
                        phoneWidth={width}
                        dark={resolvedTheme === "dark"}
                        lean={lean}
                        introStart={introStart}
                        onReady={() => setReady3D(true)}
                      />
                    </Fallback>
                  </div>
                )}
                {!(use3D && shown3D) && (
                  <div className="absolute inset-0">
                    <Phone2DStage
                      progress={progress}
                      screen={screen}
                      session={session}
                      story={story}
                      width={width}
                      lean={lean}
                      introStart={introStart}
                      still={reduced}
                    />
                  </div>
                )}
                {/* Over the phone (the 3D screen sits at z-index 10 and below). Vertical swipes still scroll the page. */}
                <div
                  data-phone-handle
                  tabIndex={live ? 0 : -1}
                  role="group"
                  aria-label="Squat video with live tracking"
                  aria-describedby={hintId}
                  onKeyDown={onKeyDown}
                  className={`absolute inset-0 z-20 touch-pan-y select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${live ? "cursor-ew-resize" : ""}`}
                  style={{ borderRadius: (48 * width) / PHONE_W }}
                  {...gestures.handlers}
                />
              </div>

              {/* At least as wide as the rail's three labels need, even when the phone is small. */}
              <div className="mt-7 w-[max(var(--phone-w),240px)]">
                {!reduced && <ChapterRail progress={progress} onProgress={onProgress} screen={screen} onSelect={goTo} />}
                <Hint id={hintId} shown={live && !(gestures.scrubbed && tapped)} />
              </div>
            </div>

            <div className="w-full max-w-[320px] sm:flex-1 lg:w-auto lg:max-w-none lg:justify-self-start">
              <LiveReadout state={state} onJoint={(j) => session.setJoint(j)} variant={wide ? "full" : "compact"} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * How to play with the phone, under it. Fades once the visitor has scrubbed and tapped.
 * Also the handle's description, with the keys for keyboard users.
 */
function Hint({ id, shown }: { id: string; shown: boolean }) {
  return (
    <p
      id={id}
      aria-hidden="true"
      className={`mt-3 text-center text-[13px] leading-[18px] text-muted transition-[opacity,visibility] duration-500 ${shown ? "visible opacity-100" : "invisible opacity-0"}`}
    >
      <span className="block">Drag to move through the squat.</span> <span className="block">Tap a joint to measure it.</span>
      <span className="sr-only"> Arrow keys step through it, and Enter changes the joint.</span>
    </p>
  );
}
