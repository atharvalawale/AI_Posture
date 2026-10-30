import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const APPS = "iPhone and Android apps coming soon.";

test("hero, calls to action and sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("See every degree of your recovery.");
  await expect(page.getByRole("link", { name: "Start your recovery" }).first()).toHaveAttribute("href", "/session");
  await expect(page.getByRole("main").getByRole("link", { name: "For physiotherapists" }).first()).toHaveAttribute("href", "/for-physios");
  await expect(page.getByText(APPS).first()).toBeVisible();
  await expect(page.locator("section#how-it-works")).toHaveCount(1);
  const text = (await page.locator("main").textContent()) ?? "";
  expect(text).not.toMatch(/PhysioAI|Fixbee|—|\p{Extended_Pictographic}/u);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`no serious accessibility violations in ${colorScheme} mode`, async ({ browser }) => {
    // Reduced motion: no pin, every section in normal flow, so axe sees the whole page.
    const context = await browser.newContext({ colorScheme, reducedMotion: "reduce" });
    const page = await context.newPage();
    try {
      await page.goto("/");
      await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${colorScheme}\\b`));
      const { violations } = await new AxeBuilder({ page }).analyze();
      const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

test("How it works: each step changes the panel", async ({ page }) => {
  await page.goto("/");
  const how = page.locator("section#how-it-works");
  await how.getByRole("tab", { name: /Review/ }).click();
  await expect(how.getByRole("button", { name: /^Rep 1\b/ })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(how.getByRole("tab", { name: /Practice/ })).toHaveAttribute("aria-selected", "true");
});

test("How it works: scrolling under a resting cursor does not change the step", async ({ browser }) => {
  // Reduced motion turns off auto advance, so only the cursor could change the step.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await page.goto("/");
    const how = page.locator("section#how-it-works");
    const tabs = how.getByRole("tab");
    await page.locator("#how-title").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 80));
    const box = (await tabs.first().boundingBox())!;
    // Rest the cursor above the steps, then scroll every step up through it.
    await page.mouse.move(box.x + box.width / 2, 120);
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 80);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const last = (await tabs.last().boundingBox())!;
    expect(last.y + last.height).toBeLessThan(120);
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  } finally {
    await context.close();
  }
});

test("How it works: on tablets the panel sits above three step cards in a row", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const page = await context.newPage();
  try {
    await page.goto("/");
    const how = page.locator("section#how-it-works");
    await how.scrollIntoViewIfNeeded();
    const tablist = how.getByRole("tablist");
    await expect(tablist).toHaveAttribute("aria-orientation", "horizontal");
    const boxes = await Promise.all((await how.getByRole("tab").all()).map(async (t) => (await t.boundingBox())!));
    expect(boxes).toHaveLength(3);
    expect(new Set(boxes.map((b) => Math.round(b.y))).size).toBe(1);
    expect(new Set(boxes.map((b) => Math.round(b.height))).size).toBe(1);
    expect(boxes[0].x).toBeLessThan(boxes[1].x);
    expect(boxes[1].x).toBeLessThan(boxes[2].x);
    const panel = (await how.locator('[role="tabpanel"]:not([inert])').boundingBox())!;
    expect(boxes[0].y).toBeGreaterThan(panel.y + panel.height);
  } finally {
    await context.close();
  }
});

test("How it works: the review chart's target line meets the bars that reached it", async ({ page }) => {
  await page.goto("/");
  const how = page.locator("section#how-it-works");
  await how.getByRole("tab", { name: /Review/ }).click();
  const panel = how.locator('[role="tabpanel"]:not([inert])');
  await expect(panel.getByRole("button", { name: /^Rep 1\b/ })).toBeVisible();
  const { lineY, bars } = await panel.evaluate((el) => {
    const line = el.querySelector("[data-target-line] > span")!.getBoundingClientRect();
    return {
      lineY: line.top + line.height / 2,
      bars: [...el.querySelectorAll<HTMLElement>("[data-reached]")].map((b) => ({
        reached: b.dataset.reached === "true",
        top: b.querySelector("[data-bar]")!.getBoundingClientRect().top,
      })),
    };
  });
  expect(bars.some((b) => !b.reached)).toBe(true);
  for (const bar of bars) {
    if (bar.reached) expect(bar.top).toBeLessThanOrEqual(lineY + 0.5);
    else expect(bar.top).toBeGreaterThan(lineY);
  }
});

test("How it works: only one squat video plays at a time", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const how = page.locator("section#how-it-works");
  const playing = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("video")].filter((v) => !v.paused).map((v) => (v.closest("#how-it-works") ? "how" : "hero")),
    );
  await expect.poll(playing).toEqual(["hero"]);
  await how.getByRole("tab", { name: /Practice/ }).click();
  await expect(page.locator("[data-phone-stage]")).not.toBeInViewport();
  await expect.poll(playing).toEqual(["how"]);
  await how.getByRole("tab", { name: /Review/ }).click();
  await expect.poll(playing).toEqual([]);
});
