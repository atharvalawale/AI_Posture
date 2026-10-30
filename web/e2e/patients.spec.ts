import { expect, test } from "@playwright/test";

test.describe("/for-patients recovery slider", () => {
  test("the week slider and the chart change the deepest bend", async ({ page }) => {
    await page.goto("/for-patients");
    const angle = page.locator("[data-recovery-angle]");
    await expect(angle).toHaveText(/^\d+$/);
    const week1 = Number(await angle.textContent());
    expect(week1).toBeGreaterThanOrEqual(135);
    expect(week1).toBeLessThanOrEqual(145);

    const slider = page.getByRole("slider", { name: "Recovery week" });
    await slider.focus();
    await page.keyboard.press("End");
    await expect(angle).toHaveText("95");
    await expect(slider).toHaveAttribute("aria-valuetext", "Week 6, deepest knee bend 95°");

    await page.getByRole("button", { name: /^Week 3, \d+°$/ }).first().click();
    await expect(slider).toHaveValue("3");
    await expect(page.getByText("Deepest knee bend, week 3")).toBeVisible();
  });

  test("no horizontal scroll at 360 px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/for-patients");
    await expect(page.locator("[data-recovery-angle]")).toHaveText(/^\d+$/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);
  });
});

test.describe("/for-patients steps and live demos", () => {
  test("each step changes the panel", async ({ page }) => {
    await page.goto("/for-patients");
    const tabs = page.getByRole("tablist", { name: "How FiixBE works for you" });
    for (const [title, text] of [
      ["Exercise with the camera on", "Step back until your whole body is inside the guide"],
      ["Track your progress", "Shared with your physio"],
      ["Get your plan", "Good morning, Maya"],
    ] as const) {
      await tabs.getByRole("tab", { name: new RegExp(title) }).click();
      await expect(page.getByRole("tabpanel").filter({ hasText: text })).toBeVisible();
    }
  });

  test("three demo figures play the squat and count a rep", async ({ page }) => {
    await page.goto("/for-patients");
    const reps = page.locator("[data-demo-reps]");
    await reps.scrollIntoViewIfNeeded();
    await expect(page.locator("[data-demo-figure] svg")).toHaveCount(3);
    // The first squat bottoms at 3 s and counts once she stands back up.
    await expect.poll(async () => Number(await reps.textContent()), { timeout: 8_000 }).toBeGreaterThanOrEqual(1);
    await expect(page.locator("[data-demo-scores] > div").first()).toBeVisible();
  });

  test("under reduced motion the demos hold still with reps counted", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/for-patients");
    const reps = page.locator("[data-demo-reps]");
    await reps.scrollIntoViewIfNeeded();
    await expect(reps).toHaveText("2");
    await expect(page.locator("[data-demo-cue]")).toHaveText("Good depth, hold");
    await expect(page.locator("[data-demo-scores] > div")).toHaveCount(2);
    await context.close();
  });
});
