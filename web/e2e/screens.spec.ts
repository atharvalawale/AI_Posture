import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// Review screenshots, not a regression check. Run with SCREENS=1.
// SCREENS_DIR copies each PNG to a second folder as well (for example a review folder).
// On the homepage the scroll story pins while you scroll, so a full-page capture shows its scroll
// distance as empty page under the hero. Review the story itself by scrolling through it.
test.skip(process.env.SCREENS !== "1", "Set SCREENS=1 to take the review screenshots");

const PAGES = [
  { name: "home", path: "/" },
  { name: "for-physios", path: "/for-physios" },
  { name: "for-patients", path: "/for-patients" },
] as const;
const WIDTHS = [360, 390, 430, 768, 1024, 1280, 1440] as const;
const THEMES = ["light", "dark"] as const;
const HEIGHT = 800;

const OUT = path.join("test-results", "screens");
const COPY = process.env.SCREENS_DIR;

for (const { name, path: route } of PAGES) {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      test(`${name} ${width} ${theme}`, async ({ browser }) => {
        test.slow();
        const context = await browser.newContext({ viewport: { width, height: HEIGHT }, colorScheme: theme });
        const page = await context.newPage();
        try {
          await page.goto(route);
          await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
          // Walk the page once so lazy media, the pose clips and scroll reveals have all run.
          const total = await page.evaluate(() => document.documentElement.scrollHeight);
          for (let y = 0; y < total; y += HEIGHT / 2) {
            await page.evaluate((top) => window.scrollTo(0, top), y);
            await page.waitForTimeout(150);
          }
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(800);

          const file = `${name}-${width}-${theme}.png`;
          const png = await page.screenshot({ fullPage: true, animations: "disabled" });
          for (const dir of COPY ? [OUT, COPY] : [OUT]) {
            mkdirSync(dir, { recursive: true });
            writeFileSync(path.join(dir, file), png);
          }
        } finally {
          await context.close();
        }
      });
    }
  }
}
