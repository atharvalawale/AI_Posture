"use client";

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { useShowcase } from "./useShowcase";

export type ShowcaseItem = {
  id: string;
  title: string;
  body: string;
  icon?: ReactNode;
  note?: string;
  /**
   * Cards layout only: more of the card, under its body. It sits outside the tab, so it may hold links.
   * Its wrapper is a column that fills the card's height, and has `data-active` while the card is the active one,
   * so content can show only then (`in-data-active:`).
   */
  detail?: ReactNode;
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

const lifted = "border-line bg-surface shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)]";

/** Whether focus came the keyboard's way. Engines without `:focus-visible` ring every focus. */
function focusVisible(el: Element) {
  try {
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
}

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
  const { active, select, holdProps, tabProps, tabId, panelId, rootRef } = useShowcase(count, { autoAdvanceMs });
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
  // The steps row is horizontal below 1024 px (titles only on phones, cards on tablets). From 1024 px the steps stack, so the keys that matter are vertical.
  // Cards with a detail sit side by side from 640 to 1023 px, so they track the 640 px line too.
  const [wide, setWide] = useState(false);
  const [tablet, setTablet] = useState(false);
  // The detailed card whose tab has keyboard focus. Its whole face takes the ring, since the tab is only its top.
  const [ring, setRing] = useState<number | null>(null);
  useEffect(() => {
    const lg = window.matchMedia("(min-width: 1024px)");
    const sm = window.matchMedia("(min-width: 640px)");
    const update = () => {
      setWide(lg.matches);
      setTablet(sm.matches && !lg.matches);
    };
    update();
    lg.addEventListener?.("change", update);
    sm.addEventListener?.("change", update);
    return () => {
      lg.removeEventListener?.("change", update);
      sm.removeEventListener?.("change", update);
    };
  }, []);
  // Below 1024 px the steps sit in one row: titles only under 640 px, cards with their line from 640 px. That only fits three, so any other count stays a stacked list.
  const row = layout === "steps" && items.length === 3;
  // Cards with a detail: a tablist may hold only tabs, so a card's detail (and its links) can't sit inside its tab.
  // Three layers share one grid instead, through subgrid: the card faces, the tabs, and the details. A card spans its
  // tab row and its detail row. Phones and desktops stack the cards with a 12 px row between them; tablets (640 to
  // 1023 px) put them side by side, one column each, so the tab rows and the detail rows line up across the cards.
  const detailed = layout === "cards" && items.some((item) => item.detail);
  const layer = "col-span-full row-span-full grid grid-cols-subgrid grid-rows-subgrid";
  const place = (i: number) =>
    ({ "--tab-row": 3 * i + 1, "--detail-row": 3 * i + 2, "--col": i + 1 }) as CSSProperties;

  return (
    <div
      ref={rootRef as RefObject<HTMLDivElement>}
      {...holdProps}
      className={`grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 ${className}`}
    >
      <div
        className={`min-w-0 ${
          detailed
            ? "grid grid-cols-1 grid-rows-(--rows) sm:grid-cols-[repeat(var(--count),minmax(0,1fr))] sm:grid-rows-[auto_auto] sm:gap-x-3 lg:grid-cols-1 lg:grid-rows-(--rows) lg:gap-x-0"
            : ""
        }`}
        style={
          detailed
            ? ({ "--rows": items.map(() => "auto auto").join(" 0.75rem "), "--count": count } as CSSProperties)
            : undefined
        }
      >
        {detailed && (
          <div aria-hidden className={`pointer-events-none ${layer}`}>
            {items.map((item, i) => (
              <div
                key={item.id}
                data-card-face
                data-ring={ring === i || undefined}
                style={place(i)}
                className={`${ring === i ? "outline-2 outline-offset-2 outline-accent" : ""} [grid-row:var(--tab-row)/span_2] sm:[grid-column:var(--col)] sm:[grid-row:1/span_2] lg:[grid-column:1] lg:[grid-row:var(--tab-row)/span_2] rounded-xl border transition-[background-color,border-color,box-shadow] duration-200 ${
                  active === i ? lifted : "border-transparent sm:border-line lg:border-transparent"
                }`}
              />
            ))}
          </div>
        )}
        <div
          role="tablist"
          aria-label={label}
          aria-orientation={(row && !wide) || (detailed && tablet) ? "horizontal" : "vertical"}
          className={detailed ? layer : row ? "grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-1" : "grid gap-3"}
        >
          {items.map((item, i) => {
            const on = active === i;
            return (
              <button
                key={item.id}
                type="button"
                {...tabProps(i)}
                style={detailed ? place(i) : undefined}
                onFocusCapture={detailed ? (e) => setRing(focusVisible(e.currentTarget) ? i : null) : undefined}
                onBlurCapture={detailed ? () => setRing(null) : undefined}
                className={`${detailed ? "[grid-row:var(--tab-row)] sm:[grid-column:var(--col)] sm:[grid-row:1] lg:[grid-column:1] lg:[grid-row:var(--tab-row)]" : ""} flex min-h-11 w-full cursor-pointer gap-4 rounded-xl border text-left transition-[background-color,border-color,box-shadow] duration-200 ${detailed ? "outline-none" : focus} ${
                  row
                    ? "items-center justify-center px-3 py-2 sm:h-full sm:flex-col sm:items-start sm:justify-start sm:gap-3 sm:px-5 sm:py-4 lg:flex-row lg:gap-4"
                    : detailed
                      ? "items-start px-5 pt-4 pb-3"
                      : "items-start px-5 py-4"
                } ${
                  detailed
                    ? "border-transparent"
                    : on
                      ? lifted
                      : `border-transparent hover:bg-surface/60 ${row ? "sm:border-line lg:border-transparent" : ""}`
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
                  <span className={`${row ? "hidden sm:block" : "block"} mt-1 text-[15px] text-pretty text-muted lg:text-balance`}>{item.body}</span>
                  {item.note && <span className={`${row ? "hidden sm:block" : "block"} mt-1 text-[13px] text-muted`}>{item.note}</span>}
                </span>
              </button>
            );
          })}
        </div>
        {detailed && (
          <div className={`pointer-events-none ${layer}`}>
            {items.map((item, i) => (
              <div
                key={item.id}
                data-active={active === i || undefined}
                style={place(i)}
                // The detail is part of the card, so pointing at it or tapping it picks the card too.
                onPointerMove={(e) => {
                  if (e.pointerType === "mouse" && active !== i) select(i);
                }}
                onClick={() => select(i)}
                className="pointer-events-auto flex min-w-0 flex-col items-start px-5 pb-5 [grid-row:var(--detail-row)] sm:[grid-column:var(--col)] sm:[grid-row:2] lg:[grid-column:1] lg:[grid-row:var(--detail-row)]"
              >
                {item.detail}
              </div>
            ))}
          </div>
        )}
        {row && <p className="mt-3 min-h-[2lh] text-[15px] text-balance text-muted sm:hidden">{items[active].body}</p>}
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
              className={`col-start-1 row-start-1 rounded-xl ${focus} transition-[opacity,visibility] duration-300 ${on ? "visible opacity-100" : "invisible opacity-0"}`}
            >
              <PanelActive value={on}>{panel}</PanelActive>
            </div>
          );
        })}
      </div>
    </div>
  );
}
