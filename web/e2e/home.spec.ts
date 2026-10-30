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

test("Problem: the week switches from a printed sheet to FiixBE", async ({ page }) => {
  await page.goto("/");
  const problem = page.locator('section[aria-labelledby="problem-title"]');
  const sheet = problem.getByRole("button", { name: "From a printed sheet" });
  const fiixbe = problem.getByRole("button", { name: "With FiixBE" });
  await expect(sheet).toHaveAttribute("aria-pressed", "true");
  await expect(problem.getByText("Your physio sees nothing until your next visit.")).toBeVisible();
  await fiixbe.click();
  await expect(fiixbe).toHaveAttribute("aria-pressed", "true");
  await expect(sheet).toHaveAttribute("aria-pressed", "false");
  await expect(problem.getByText("Your physio sees every rep, every day")).toBeVisible();
  await expect(problem.getByText("Your physio sees nothing until your next visit.")).toBeHidden();
});

test("Problem: on phones each day shows only its day and number, at 13 px or more", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto("/");
    const problem = page.locator('section[aria-labelledby="problem-title"]');
    for (const mode of ["From a printed sheet", "With FiixBE"]) {
      await problem.getByRole("button", { name: mode }).click();
      const days = problem.locator("[data-day]:visible");
      await expect(days).toHaveCount(7);
      const cells = await days.evaluateAll((els) =>
        els.map((el) => {
          const box = el.getBoundingClientRect();
          const texts = [...el.querySelectorAll<HTMLElement>("*")].filter(
            (t) => t.childElementCount === 0 && t.checkVisibility({ visibilityProperty: true }) && t.getBoundingClientRect().width > 1 && t.textContent?.trim(),
          );
          return {
            lines: texts.length,
            smallest: Math.min(...texts.map((t) => parseFloat(getComputedStyle(t).fontSize))),
            // Measure the text itself: a block stretches to its cell, so its own width says nothing.
            fits: texts.every((t) => {
              const range = document.createRange();
              range.selectNodeContents(t);
              const r = range.getBoundingClientRect();
              return r.left >= box.left + 1 && r.right <= box.right - 1;
            }),
          };
        }),
      );
      for (const [i, cell] of cells.entries()) {
        // Today has no score yet: a dot under the day marks it.
        expect(cell.lines).toBe(mode === "With FiixBE" && i === 6 ? 1 : 2);
        expect(cell.smallest).toBeGreaterThanOrEqual(13);
        expect(cell.fits).toBe(true);
      }
    }
  } finally {
    await context.close();
  }
});

test("Both sides: each card changes the panel and keeps its link", async ({ page }) => {
  await page.goto("/");
  const sides = page.locator('section[aria-labelledby="sides-title"]');
  const panel = sides.locator('[role="tabpanel"]:not([inert])');
  await expect(sides.getByRole("link", { name: "How FiixBE works for physios" })).toHaveAttribute("href", "/for-physios");
  await expect(sides.getByRole("link", { name: "How FiixBE works for patients" })).toHaveAttribute("href", "/for-patients");
  await expect(sides.getByText("Alerts when a session is missed")).toBeVisible();
  await expect(panel.getByText("Squats, sent from Maya's phone this morning")).toBeVisible();
  await sides.getByRole("tab", { name: /For patients/ }).click();
  await expect(panel.getByText("Session complete")).toBeVisible();
  await expect(sides.getByText("Live form correction")).toBeVisible();
  await expect(sides.getByText("Alerts when a session is missed")).toBeHidden();
});

test("Both sides: on tablets the two cards sit side by side, their links in line", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const page = await context.newPage();
  try {
    await page.goto("/");
    const sides = page.locator('section[aria-labelledby="sides-title"]');
    await sides.scrollIntoViewIfNeeded();
    await expect(sides.getByRole("tablist")).toHaveAttribute("aria-orientation", "horizontal");
    const [a, b] = await Promise.all((await sides.getByRole("tab").all()).map(async (t) => (await t.boundingBox())!));
    expect(Math.round(a.y)).toBe(Math.round(b.y));
    expect(a.x + a.width).toBeLessThan(b.x);
    const links = await Promise.all((await sides.getByRole("link").all()).map(async (l) => (await l.boundingBox())!));
    expect(Math.round(links[0].y)).toBe(Math.round(links[1].y));
    const panel = (await sides.locator('[role="tabpanel"]:not([inert])').boundingBox())!;
    expect(a.y).toBeGreaterThan(panel.y + panel.height);
  } finally {
    await context.close();
  }
});
