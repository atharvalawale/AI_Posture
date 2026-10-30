import { expect, test, type Page } from "@playwright/test";

const PAGES = ["/", "/for-physios", "/for-patients"] as const;
const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1440] as const;
const HEIGHT = 800;

/**
 * The page floor. App UI inside a phone mockup (`data-phone-screen`) is drawn at real-phone scale and
 * holds nothing found only there, so it may go down to PHONE_MIN as the visitor sees it (ruling R29).
 * The homepage hero phone is exempt from PHONE_MIN: it is sized to the viewport height so the whole
 * scroll story fits one screen, and every fact on its screens is repeated in words beside it.
 */
const MIN_TEXT = 13;
const PHONE_MIN = 9;
const MIN_TARGET = 44;

type Findings = { overflow: number; smallText: string[]; smallPhoneText: string[]; smallTargets: string[] };

/** Checks every element that is at least partly inside the viewport right now: the header, the page and the footer. */
function inspect(page: Page) {
  return page.evaluate(
    ({ MIN_TEXT, PHONE_MIN, MIN_TARGET }): Findings => {
      const vh = window.innerHeight;
      const page = document.body;
      const describe = (el: Element) => {
        const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
        const label = el.getAttribute("aria-label") ?? "";
        return `<${el.tagName.toLowerCase()}> "${label || text}"`;
      };
      const shown = (el: Element) => {
        const r = el.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1 || r.bottom <= 0 || r.top >= vh) return false;
        if (el.closest("[inert]")) return false;
        const s = getComputedStyle(el);
        return s.visibility !== "hidden" && s.opacity !== "0" && el.checkVisibility({ opacityProperty: true });
      };

      const smallText: string[] = [];
      const smallPhoneText: string[] = [];
      for (const el of page.querySelectorAll("*")) {
        const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== "");
        if (!ownText || !shown(el)) continue;
        // SVG text is sized in viewBox units, so scale it to what lands on screen.
        const svgScale = el instanceof SVGGraphicsElement ? Math.abs(el.getScreenCTM()?.a ?? 1) : 1;
        const size = parseFloat(getComputedStyle(el).fontSize) * svgScale;
        const screen = el.closest("[data-phone-screen]");
        if (screen && el.closest("[data-phone-stage]")) continue;
        if (screen) {
          // The phone is scaled as a whole (CSS transform, or the 3D phone's projection),
          // so the size a visitor reads is the layout size times that scale.
          const scale = screen.getBoundingClientRect().width / (screen as HTMLElement).offsetWidth;
          if (size * scale < PHONE_MIN - 0.05) smallPhoneText.push(`${describe(el)} ${(size * scale).toFixed(1)}px`);
        } else if (size < MIN_TEXT - 0.05) {
          smallText.push(`${describe(el)} ${size.toFixed(1)}px`);
        }
      }

      // A control may grow its touch area past its box with an absolutely placed ::before or ::after
      // (negative insets), so the target is the larger of the box and that pseudo-element.
      const target = (el: Element) => {
        const r = el.getBoundingClientRect();
        let { width, height } = r;
        for (const pseudo of ["::before", "::after"]) {
          const s = getComputedStyle(el, pseudo);
          if (s.content === "none" || s.content === "normal" || s.position !== "absolute") continue;
          const [t, rt, b, l] = [s.top, s.right, s.bottom, s.left].map(parseFloat);
          if (![t, b].some(Number.isNaN)) height = Math.max(height, r.height - t - b);
          if (![l, rt].some(Number.isNaN)) width = Math.max(width, r.width - l - rt);
        }
        return { width, height };
      };
      // A link inside a sentence is exempt (WCAG 2.5.8): it can only be as tall as its line.
      const inSentence = (el: Element) =>
        getComputedStyle(el).display === "inline" &&
        [...(el.parentElement?.childNodes ?? [])].some((n) => n !== el && n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== "");
      const smallTargets: string[] = [];
      for (const el of page.querySelectorAll("a[href], button, [role=tab], input[type=range]")) {
        if (!shown(el) || inSentence(el)) continue;
        const { width, height } = target(el);
        if (height < MIN_TARGET - 0.5 || width < MIN_TARGET - 0.5) {
          smallTargets.push(`${describe(el)} ${Math.round(width)}x${Math.round(height)}`);
        }
      }

      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        smallText,
        smallPhoneText,
        smallTargets,
      };
    },
    { MIN_TEXT, PHONE_MIN, MIN_TARGET },
  );
}

for (const path of PAGES) {
  for (const width of WIDTHS) {
    test(`${path} at ${width} px: no sideways scroll, readable text, 44 px targets`, async ({ page }) => {
      test.slow();
      await page.setViewportSize({ width, height: HEIGHT });
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();

      const overflow = new Set<string>();
      const smallText = new Set<string>();
      const smallPhoneText = new Set<string>();
      const smallTargets = new Set<string>();
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; ; y += HEIGHT) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(250);
        const found = await inspect(page);
        if (found.overflow > 0) overflow.add(`${found.overflow}px at scroll ${y}`);
        found.smallText.forEach((s) => smallText.add(s));
        found.smallPhoneText.forEach((s) => smallPhoneText.add(s));
        found.smallTargets.forEach((s) => smallTargets.add(s));
        // The scroll story can grow the page once it measures itself, so read the height again.
        const now = await page.evaluate(() => document.documentElement.scrollHeight);
        if (y + HEIGHT >= Math.max(total, now)) break;
      }

      expect.soft([...overflow], "page scrolls sideways").toEqual([]);
      expect.soft([...smallText], `text under ${MIN_TEXT} px`).toEqual([]);
      expect.soft([...smallPhoneText], `phone screen text under ${PHONE_MIN} px`).toEqual([]);
      expect.soft([...smallTargets], `targets under ${MIN_TARGET} px`).toEqual([]);
    });
  }
}
