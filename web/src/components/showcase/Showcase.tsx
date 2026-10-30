"use client";

import type { ReactNode, RefObject } from "react";
import { useShowcase } from "./useShowcase";

export type ShowcaseItem = { id: string; title: string; body: string; icon?: ReactNode; note?: string };

type Props = {
  label: string;
  items: ShowcaseItem[];
  panels: ReactNode[];
  layout: "steps" | "cards";
  autoAdvanceMs?: number;
  className?: string;
};

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** A list of items beside one panel. The active item is lifted and its panel shows; hover, tap, focus and arrow keys all change it. */
export function Showcase({ label, items, panels, layout, autoAdvanceMs, className = "" }: Props) {
  const { active, tabProps, tabId, panelId, rootRef } = useShowcase(items.length, { autoAdvanceMs });
  // Under 640 px the steps fold into one row of titles. That only fits three, so any other count stays a stacked list.
  const row = layout === "steps" && items.length === 3;

  return (
    <div
      ref={rootRef as RefObject<HTMLDivElement>}
      className={`grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 ${className}`}
    >
      <div className="min-w-0">
        <div
          role="tablist"
          aria-label={label}
          aria-orientation={row ? undefined : "vertical"}
          className={row ? "grid grid-cols-3 gap-2 sm:grid-cols-1 sm:gap-3" : "grid gap-3"}
        >
          {items.map((item, i) => {
            const on = active === i;
            return (
              <button
                key={item.id}
                type="button"
                {...tabProps(i)}
                className={`flex min-h-11 w-full cursor-pointer items-start gap-4 rounded-xl border text-left transition-[background-color,border-color,box-shadow] duration-200 ${focus} ${
                  row ? "items-center justify-center px-3 py-2 sm:items-start sm:justify-start sm:px-5 sm:py-4" : "px-5 py-4"
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
                  <span className="block text-[17px] font-semibold text-text">{item.title}</span>
                  <span className={`${row ? "hidden sm:block" : "block"} mt-1 text-[15px] text-muted`}>{item.body}</span>
                  {item.note && <span className={`${row ? "hidden sm:block" : "block"} mt-1 text-[13px] text-muted`}>{item.note}</span>}
                </span>
              </button>
            );
          })}
        </div>
        {row && <p className="mt-3 text-[15px] text-muted sm:hidden">{items[active].body}</p>}
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
              inert={!on}
              className={`col-start-1 row-start-1 transition-opacity duration-300 ${on ? "opacity-100" : "invisible opacity-0"}`}
            >
              {panel}
            </div>
          );
        })}
      </div>
    </div>
  );
}
