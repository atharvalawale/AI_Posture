"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Showcase, type ShowcaseItem } from "@/components/showcase/Showcase";
import { FEATURE_PANELS } from "./featurePanels";

/** A feature's icon in a rounded square. It fills with the accent while its card is the selected one. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-10 items-center justify-center rounded-[10px] bg-surface-2 text-muted transition-colors in-aria-selected:bg-accent in-aria-selected:text-on-accent">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  );
}

const ICONS: Record<string, ReactNode> = {
  form: (
    <>
      <path d="M12 4v6l-4 4M12 10l4 4M8 20v-6M16 20v-6" />
      <circle cx="12" cy="3" r="1.5" />
    </>
  ),
  dash: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 9v11" />
    </>
  ),
  alerts: (
    <>
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  rx: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  report: <path d="M4 20h16M6 16l4-5 3 3 5-7" />,
  msg: <path d="M4 5h16v11H9l-5 4z" />,
  book: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  tele: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10l5-3v10l-5-3" />
    </>
  ),
  multi: <path d="M3 21V9l6-4 6 4v12M15 21v-9l6 3v6M3 21h18M7 13h4M7 17h4" />,
};

type Card = { id: string; title: string; body: string; note?: string };

const GROUPS: { title: string; intro: string; cards: Card[] }[] = [
  {
    title: "See every session",
    intro: "Know how each home session went, rep by rep, without being in the room.",
    cards: [
      { id: "form", title: "AI form analysis", body: "Joint angles, range of motion and smoothness on every rep." },
      { id: "dash", title: "Patient dashboard", body: "Every patient's scores, angles and sessions, updated live." },
      { id: "alerts", title: "Smart alerts", body: "Missed sessions and low scores reach you first." },
    ],
  },
  {
    title: "Prescribe and follow up",
    intro: "Write the plan once. Adjust it as the numbers come in.",
    cards: [
      { id: "rx", title: "Exercise prescription", body: "Pick from a library of physio-validated movements." },
      { id: "report", title: "Progress reports", body: "A weekly PDF for the patient or for insurance." },
      { id: "msg", title: "Messaging", body: "Voice notes, corrections and encouragement." },
    ],
  },
  {
    title: "Run your practice",
    intro: "Bookings, calls and every clinic you run, in one place.",
    cards: [
      { id: "book", title: "Appointment booking", body: "In-clinic or video, booked with you directly." },
      { id: "tele", title: "Teleconsultation", body: "Video calls inside FiixBE.", note: "Planned" },
      { id: "multi", title: "Multi-clinic support", body: "Every clinic, physio and patient under one account." },
    ],
  },
];

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * Three serif tabs, each with a one-line intro and three feature cards beside one visual.
 * Below 1024 px the tab row scrolls sideways. Switching tabs starts again at the first card.
 */
export function FeatureTabs({ className = "" }: { className?: string }) {
  const prefix = useId();
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const group = GROUPS[active];
  const tabId = (i: number) => `${prefix}-tab-${i}`;
  const panelId = `${prefix}-panel`;

  const select = (i: number, moveFocus = false) => {
    setActive(i);
    const tab = tabs.current[i];
    const list = listRef.current;
    if (!tab || !list) return;
    if (moveFocus) tab.focus();
    // Bring the tab fully into the scrolling row without scrolling the page.
    if (tab.offsetLeft < list.scrollLeft) list.scrollLeft = tab.offsetLeft;
    else if (tab.offsetLeft + tab.offsetWidth > list.scrollLeft + list.clientWidth) list.scrollLeft = tab.offsetLeft + tab.offsetWidth - list.clientWidth;
  };

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const n = GROUPS.length;
    const to =
      e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
    if (to === null) return;
    e.preventDefault();
    select(to, true);
  };

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-label="Features"
        className="relative flex gap-9 overflow-x-auto shadow-[inset_0_-1px_0_var(--line)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {GROUPS.map((g, i) => {
          const on = i === active;
          return (
            <button
              key={g.title}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={tabId(i)}
              aria-selected={on}
              aria-controls={on ? panelId : undefined}
              tabIndex={on ? 0 : -1}
              onClick={() => select(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative shrink-0 cursor-pointer pb-4 font-serif text-[28px] leading-tight tracking-[-0.01em] whitespace-nowrap transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-accent ${focus} focus-visible:outline-offset-[-2px] ${
                on ? "text-text after:opacity-100" : "text-muted after:opacity-0 hover:text-text"
              }`}
            >
              {g.title}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={tabId(active)}>
        <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-pretty text-muted">{group.intro}</p>
        <Showcase
          key={active}
          className="mt-8"
          label={group.title}
          layout="cards"
          items={group.cards.map<ShowcaseItem>((c) => ({ ...c, icon: <Icon>{ICONS[c.id]}</Icon> }))}
          panels={group.cards.map((c) => {
            const Panel = FEATURE_PANELS[c.id];
            return <Panel key={c.id} />;
          })}
        />
      </div>
    </div>
  );
}
