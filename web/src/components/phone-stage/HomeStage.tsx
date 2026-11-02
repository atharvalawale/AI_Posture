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
import { track } from "@/lib/analytics";
import { hasWebGL2 } from "@/lib/device";
import { LiveSession, coverBox, loadPoseClip, nearestJoint, type PoseClip } from "@/lib/pose";
import { ChapterNote, PlanDetails, SummaryDetails } from "./ChapterDetails";
import { ChapterRail } from "./ChapterRail";
import { engage, isEngaged, subscribeEngaged } from "./engagement";
import { phonePointToScreen } from "./gestures";
import { Phone2DStage } from "./Phone2DStage";
import { StillChapters } from "./StillChapters";
import { useScrollStory } from "./useScrollStory";
import { usePhoneGestures } from "./usePhoneGestures";

const Phone3D = dynamic(() => import("./Phone3D"), { ssr: false, loading: () => null });

const noop = () => () => {};
const DESKTOP = "(min-width: 1024px)";
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
 * Without JavaScript nothing pins, scrubs or switches chapters: the summary and the plan show as still
 * sections, and the controls that need a script (the chapter rail, the hint, the joint buttons) step aside.
 */
const NO_SCRIPT = `<style>[data-still-chapters]{display:block!important}[data-stage-rail],[data-stage-hint],[data-readout-joints]{display:none!important}</style>`;

/**
 * The stage is sized in CSS, so the server renders it at its final size and nothing shifts on load.
 * `--frame-h` (set on the section): the viewport below the site header (`--header-h`), and on
 * desktop at least 600 px. `--phone-w`: the phone width that leaves `--below-phone` of the frame
 * free (the chapter rail and the hint, and on phones the compact readout too), between 110 px and
 * the design width. Below 350 px the plan details wrap to one more line, so they leave 21 px more.
 */
const STAGE_VARS = {
  "--phone-w": `clamp(110px, calc((var(--frame-h) - var(--below-phone)) * ${PHONE_W} / ${PHONE_H}), ${PHONE_W}px)`,
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
 * phone in the center and the live readout on the right. One LiveSession drives the phone screen
 * and the readout. Drag the phone to scrub the squat, tap a joint to measure it, or use the arrow
 * keys and Enter. As the visitor scrolls, the phone walks through the live session, the summary and
 * today's plan, and both side columns cross-fade with it: the headline gives way to each chapter's
 * note, and the readout to each screen's details. Below 1024 px the copy scrolls away first, then
 * the phone and the readout pin together (side by side from 640 px, stacked below). Uses the 3D
 * phone whenever the browser has WebGL 2, and the 2D phone only while the 3D code loads, without
 * WebGL 2, or if the 3D phone fails. With reduced motion, or a viewport too short for the stack that
 * pins (see `useScrollStory`): no pin and no chapter rail (and with reduced motion the phone holds
 * still at its rest angle); the summary and the plan follow as still sections, and scrub, tap and
 * keys still work. `data-pinned` on the wrapper carries that
 * decision to the CSS.
 */
export function HomeStage() {
  const sectionRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const { progress, screen, pinned, goTo, onProgress } = useScrollStory(sectionRef);
  // Analytics: how far into the story visitors get. Each screen after the first counts once per page view.
  const [seenScreens] = useState(() => new Set([screen]));
  useEffect(() => {
    if (seenScreens.has(screen)) return;
    seenScreens.add(screen);
    track("story_screen", { screen });
  }, [screen, seenScreens]);
  const story = useMemo(() => ({ progress, onProgress }), [progress, onProgress]);
  const reduced = useMedia(REDUCED, false);
  const desktop = useMedia(DESKTOP, true);
  // Below desktop the 3D phone waits for the first touch, scroll or key (see ./engagement). Until then the
  // 2D phone shows, and the page skips the WebGL probe and the 3D download.
  const engaged = useSyncExternalStore(subscribeEngaged, isEngaged, () => false);
  const want3D = desktop || engaged;
  const can3D = useSyncExternalStore(noop, want3D ? hasWebGL2 : () => false, () => false);
  const { resolvedTheme } = useTheme();
  const [ready3D, setReady3D] = useState(false);
  // The 2D phone stays under the 3D one until that has faded in, so the hand-over never shows a gap.
  const [shown3D, setShown3D] = useState(false);
  useEffect(() => {
    if (!ready3D) return;
    // Matches the 300 ms fade below. transitionend is skipped when a transition is interrupted.
    const id = window.setTimeout(() => setShown3D(true), 350);
    return () => window.clearTimeout(id);
  }, [ready3D]);
  const [failed3D, setFailed3D] = useState(false);
  // The 3D canvas, the scrub and the tap need the width as a number. The 2D phone does not: until it is
  // measured, it scales in CSS, so the server already renders it visible at its final size.
  const fitted = usePhoneWidth(boxRef);
  const width = fitted ?? PHONE_W;
  const use3D = can3D && !failed3D;
  // One clock for the turn-in, so the 3D phone takes over from the 2D one mid-turn without restarting it.
  const [introStart] = useState(() => performance.now());

  const [session] = useState(() => new LiveSession(null, { poster: true }));
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
    // `data-pinned`: whether the stage pins. True on the server, since most viewports fit.
    <div className="group/stage" data-pinned={pinned}>
      <section
        ref={sectionRef}
        data-phone-stage
        // Set once the pose data has loaded, so tests can tell the poster's angle from a measured one.
        data-clip-ready={clip ? "" : undefined}
        aria-labelledby="hero-title"
        className="relative bg-bg [--below-phone:317px] max-[350px]:[--below-phone:338px] [--frame-h:calc(100svh-var(--header-h))] sm:[--below-phone:163px] lg:[--frame-h:max(600px,calc(100svh-var(--header-h)))]"
        style={STAGE_VARS}
      >
        <div className="mx-auto grid w-full max-w-[1200px] px-6 lg:h-(--frame-h) lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-x-8 lg:px-10">
          {/* The left column on desktop: the copy, then each chapter's note. Below 1024 px only the copy, above the frame. Sizes its type from its own width. */}
          <div className="@container grid">
            <div
              {...hiddenWhen(desktop && !live)}
              className={`[grid-area:1/1] pt-12 pb-8 sm:pt-16 lg:self-center lg:py-0 ${FADE} ${live ? "" : "lg:invisible lg:opacity-0"}`}
            >
              <HeroCopy />
            </div>
            <Layer on={screen === "summary"} className="hidden self-center lg:block">
              <ChapterNote screen="summary" />
            </Layer>
            <Layer on={screen === "plan"} className="hidden self-center lg:block">
              <ChapterNote screen="plan" />
            </Layer>
          </div>

          {/* What pins: the phone, the readout and the rail. On desktop it starts at the top of the stage and spans the center and right columns. */}
          <div
            data-stage-frame
            className="grid min-h-(--frame-h) grid-cols-[minmax(0,1fr)] [align-content:safe_center] justify-items-center py-2 sm:grid-cols-[auto_minmax(0,320px)] sm:justify-center sm:gap-x-12 lg:col-span-2 lg:h-full lg:grid-cols-subgrid lg:gap-x-8 lg:self-stretch lg:py-0"
          >
            <div className="col-start-1 row-start-1">
              <div ref={boxRef} className="relative w-(--phone-w)" style={{ aspectRatio: `${PHONE_W} / ${PHONE_H}` }}>
                {use3D && (
                  <div
                    data-phone="3d"
                    data-ready={ready3D}
                    // Over the 2D phone, so the hand-over is a plain fade in with the 2D phone still underneath.
                    className={`absolute inset-0 z-10 transition-opacity duration-300 ${ready3D ? "opacity-100" : "opacity-0"}`}
                  >
                    <Fallback onError={() => setFailed3D(true)}>
                      <Phone3D
                        progress={progress}
                        screen={screen}
                        // Only the phone the visitor sees drives the clip. Until it shows, the 3D
                        // phone plays on its own; attaching then seeks it to where the session is.
                        session={ready3D ? session : undefined}
                        story={story}
                        phoneWidth={width}
                        dark={resolvedTheme === "dark"}
                        lean={lean}
                        introStart={introStart}
                        still={reduced}
                        onReady={() => {
                          // Keeps the 3D phone if the window later narrows below desktop.
                          engage();
                          setReady3D(true);
                        }}
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
                      width={fitted}
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
                  style={{ borderRadius: `calc(var(--phone-w) * ${48 / PHONE_W})` }}
                  {...gestures.handlers}
                />
              </div>
            </div>

            {/* Beside the phone from 640 px, under it below. Changes with the chapter, like the right column on desktop. */}
            <div
              data-stage-readout
              className="row-start-2 mt-3 grid w-full max-w-[320px] sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:self-center lg:justify-self-start"
            >
              <Layer on={live} className="self-start sm:self-center">
                <SessionReadout session={session} />
              </Layer>
              <Layer on={screen === "summary"} className="self-start sm:self-center">
                <ChapterNote screen="summary" className="mb-3 sm:mb-8 lg:hidden" />
                <SummaryDetails variant="stage" />
              </Layer>
              <Layer on={screen === "plan"} className="self-start sm:self-center">
                <ChapterNote screen="plan" className="mb-3 sm:mb-8 lg:hidden" />
                <PlanDetails variant="stage" />
              </Layer>
            </div>

            {/* Under the phone. At least as wide as the rail's three labels need, even when the phone is small. */}
            <div className="row-start-3 mt-3 w-[max(var(--phone-w),240px)] sm:col-start-1 sm:row-start-2 sm:mt-7">
              {/* Not with reduced motion. While unpinned: collapsed below 1024 px, where it sits below the first
                  view; only hidden on desktop, where it may be in the first view, so nothing moves. */}
              <div
                data-stage-rail
                className="motion-reduce:hidden group-data-[pinned=false]/stage:invisible max-lg:group-data-[pinned=false]/stage:h-0 max-lg:group-data-[pinned=false]/stage:overflow-hidden"
              >
                <ChapterRail progress={progress} onProgress={onProgress} screen={screen} onSelect={goTo} />
              </div>
              <Hint id={hintId} shown={live && !(gestures.scrubbed && tapped)} />
            </div>
          </div>
        </div>
      </section>
      <StillChapters />
      <noscript dangerouslySetInnerHTML={{ __html: NO_SCRIPT }} />
    </div>
  );
}

/**
 * The readout, subscribed to the session on its own. The session changes on every video frame, and
 * only the readout needs to follow it: the rest of the stage (the 3D phone above all) re-renders on
 * chapter changes only.
 */
function SessionReadout({ session }: { session: LiveSession }) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return <LiveReadout state={state} onJoint={(j) => session.setJoint(j)} />;
}

const FADE = "transition-[opacity,visibility] duration-300 motion-reduce:transition-none";

/** Takes a layer out of the accessibility tree and the tab order while another one shows. */
function hiddenWhen(hidden: boolean) {
  return hidden ? { "aria-hidden": true, inert: true } : {};
}

/** One of the layers stacked in one grid cell that cross-fade as the chapter changes. */
function Layer({ on, className = "", children }: { on: boolean; className?: string; children: ReactNode }) {
  return (
    <div {...hiddenWhen(!on)} className={`[grid-area:1/1] ${FADE} ${on ? "visible opacity-100" : "invisible opacity-0"} ${className}`}>
      {children}
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
      data-stage-hint
      aria-hidden="true"
      className={`mt-2 text-center text-[13px] leading-[18px] text-muted sm:mt-3 transition-[opacity,visibility] duration-500 ${shown ? "visible opacity-100" : "invisible opacity-0"}`}
    >
      <span className="block">Drag to move through the squat.</span> <span className="block">Tap a joint to measure it.</span>
      <span className="sr-only"> Arrow keys step through it, and Enter changes the joint.</span>
    </p>
  );
}
