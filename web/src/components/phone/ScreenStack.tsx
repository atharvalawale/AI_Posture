"use client";

import type { MutableRefObject, ReactNode } from "react";
import type { LiveSession } from "@/lib/pose";
import { LiveScreen } from "./screens/LiveScreen";
import { PlanScreen } from "./screens/PlanScreen";
import { SummaryScreen } from "./screens/SummaryScreen";
import type { ScreenId } from "./PhoneFrame";

/** The scroll story's progress (0 to 1) and a way to hear about changes, for screens that move with scroll. */
export type StoryProgress = {
  progress: MutableRefObject<number>;
  onProgress: (fn: () => void) => () => void;
};

type ScreenProps = { active?: boolean; session?: LiveSession; story?: StoryProgress };

const SCREENS: { id: ScreenId; label: string; Component: (props: ScreenProps) => ReactNode }[] = [
  { id: "live", label: "Live session", Component: LiveScreen },
  { id: "summary", label: "Session summary", Component: SummaryScreen },
  { id: "plan", label: "Today's plan", Component: PlanScreen },
];

/**
 * All three app screens stacked, cross-fading to `screen` over 250 ms.
 * Hidden screens get `visibility: hidden` once faded, so they leave the accessibility tree,
 * and `active={false}`, so the hidden video pauses. `session` and `story` are passed down as props because drei's Html
 * renders in its own React root, which context does not reach.
 */
export function ScreenStack({ screen, session, story }: { screen: ScreenId; session?: LiveSession; story?: StoryProgress }) {
  return (
    <>
      {SCREENS.map(({ id, label, Component }) => {
        const on = id === screen;
        return (
          <section
            key={id}
            aria-label={label}
            aria-hidden={!on}
            data-screen={id}
            className={`absolute inset-0 transition-[opacity,visibility] duration-250 ease-out motion-reduce:transition-none ${on ? "visible opacity-100" : "invisible opacity-0"}`}
          >
            <Component active={on} session={session} story={story} />
          </section>
        );
      })}
    </>
  );
}
