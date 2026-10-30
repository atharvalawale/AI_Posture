"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useShowcase } from "./useShowcase";

export type ShowcaseItem = {
  id: string;
  title: string;
  body: string;
  icon?: ReactNode;
  note?: string;
  /** A shorter title for the phone row of three steps, where a long title would wrap onto several lines. */
  shortTitle?: string;
};

type Props = {
  label: string;
  items: ShowcaseItem[];
  panels: ReactNode[];
  layout: "steps" | "cards";
  autoAdvanceMs?: number;
  className?: string;
};

const FOCUSABLE = 'a[href], button, input, select, textarea, video[controls], [tabindex]:not([tabindex="-1"])';
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const PanelActive = createContext(true);

/** True while the panel this is rendered in is the one showing. A panel uses it to pause work, such as a video, while hidden. */
export function useShowcasePanelActive() {
  return useContext(PanelActive);
}

/** A list of items beside one panel. The active item is lifted and its panel shows; hover, tap, focus and arrow keys all change it. */
export function Showcase({ label, items: allItems, panels: allPanels, layout, autoAdvanceMs, className = "" }: Props) {
  // Tabs and panels come from one count, so a mismatch can never leave a dangling aria-controls.
  const count = Math.min(allItems.length, allPanels.length);
  const items = allItems.slice(0, count);
  const panels = allPanels.slice(0, count);
  if (process.env.NODE_ENV !== "production" && allItems.length !== allPanels.length) {
    console.error(`Showcase "${label}": ${allItems.length} items but ${allPanels.length} panels. Extra entries are dropped.`);
  }
  const { active, holdProps, tabProps, tabId, panelId, rootRef } = useShowcase(count, { autoAdvanceMs });
  const activePanel = useRef<HTMLDivElement | null>(null);
  // WAI-ARIA: a panel with nothing focusable inside takes tabindex 0 so keyboard users can reach its content.
  const [panelNeedsStop, setPanelNeedsStop] = useState(false);
  useEffect(() => {
    const el = activePanel.current;
    const check = () => setPanelNeedsStop(!el?.querySelector(FOCUSABLE));
    check();
    if (!el || typeof MutationObserver === "undefined") return;
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [active]);
  // Phone row is horizontal. From 640 px the steps stack, so the keys that matter are vertical.
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  // Under 640 px the steps fold into one row of titles. That only fits three, so any other count stays a stacked list.
  const row = layout === "steps" && items.length === 3;

  return (
    <div
      ref={rootRef as RefObject<HTMLDivElement>}
      {...holdProps}
      className={`grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 ${className}`}
    >
      <div className="min-w-0">
        <div
          role="tablist"
          aria-label={label}
          aria-orientation={row && !wide ? "horizontal" : "vertical"}
          className={row ? "grid grid-cols-3 gap-2 sm:grid-cols-1 sm:gap-3" : "grid gap-3"}
        >
          {items.map((item, i) => {
            const on = active === i;
            return (
              <button
                key={item.id}
                type="button"
                {...tabProps(i)}
                className={`flex min-h-11 w-full cursor-pointer gap-4 rounded-xl border text-left transition-[background-color,border-color,box-shadow] duration-200 ${focus} ${
                  row ? "items-center justify-center px-3 py-2 sm:items-start sm:justify-start sm:px-5 sm:py-4" : "items-start px-5 py-4"
                } ${
                  on
                    ? "border-line bg-surface shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)]"
                    : "border-transparent hover:bg-surface/60"
                }`}
              >
                {layout === "steps" ? (
                  <span
                    aria-hidden
                    className={`${row ? "hidden sm:flex" : "flex"} size-7 shrink-0 items-center justify-center rounded-full border text-[15px] tabular-nums ${
                      on ? "border-accent text-accent" : "border-line text-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                ) : (
                  item.icon && <span aria-hidden className="mt-0.5 shrink-0 text-accent">{item.icon}</span>
                )}
                <span className="min-w-0">
                  {row && item.shortTitle ? (
                    <>
                      <span className="block text-[17px] font-semibold text-text sm:hidden">{item.shortTitle}</span>
                      <span className="hidden text-[17px] font-semibold text-text sm:block">{item.title}</span>
                    </>
                  ) : (
                    <span className="block text-[17px] font-semibold text-text">{item.title}</span>
                  )}
                  <span className={`${row ? "hidden sm:block" : "block"} mt-1 text-[15px] text-pretty text-muted`}>{item.body}</span>
                  {item.note && <span className={`${row ? "hidden sm:block" : "block"} mt-1 text-[13px] text-muted`}>{item.note}</span>}
                </span>
              </button>
            );
          })}
        </div>
        {row && <p className="mt-3 text-[15px] text-balance text-muted sm:hidden">{items[active].body}</p>}
      </div>

      <div className="order-first grid min-w-0 lg:order-none">
        {panels.map((panel, i) => {
          const on = active === i;
          return (
            <div
              key={items[i]?.id ?? i}
              role="tabpanel"
              id={panelId(i)}
              aria-labelledby={tabId(i)}
              ref={on ? activePanel : undefined}
              tabIndex={on && panelNeedsStop ? 0 : undefined}
              inert={!on}
              className={`col-start-1 row-start-1 rounded-xl ${focus} transition-opacity duration-300 ${on ? "opacity-100" : "invisible opacity-0"}`}
            >
              <PanelActive value={on}>{panel}</PanelActive>
            </div>
          );
        })}
      </div>
    </div>
  );
}
