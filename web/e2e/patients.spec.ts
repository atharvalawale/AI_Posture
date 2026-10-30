import { expect, test, type Page } from "@playwright/test";

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
    await expect(page.locator('section[aria-labelledby="patients-title"]').getByText("Deepest knee bend, week 3")).toBeVisible();
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
    // The demos open primed through the first rep, so every card shows something at first glance.
    await expect.poll(async () => Number(await reps.textContent()), { timeout: 2_000 }).toBeGreaterThanOrEqual(1);
    await expect(page.locator("[data-demo-scores] > div")).toHaveCount(3);
    await expect(page.locator("[data-demo-score]").first()).toBeVisible();
    await expect(page.locator("[data-demo-cue]")).not.toHaveText("Stand tall to begin");
    // The clip plays on: the figure moves.
    const figure = page.locator("[data-demo-figure] svg").first();
    const before = await figure.innerHTML();
    await expect.poll(() => figure.innerHTML(), { timeout: 5_000 }).not.toBe(before);
  });

  test("under reduced motion the demos hold still with reps counted", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/for-patients");
    const reps = page.locator("[data-demo-reps]");
    await reps.scrollIntoViewIfNeeded();
    await expect(reps).toHaveText("2");
    await expect(page.locator("[data-demo-cue]")).toHaveText("Good depth, hold");
    await expect(page.locator("[data-demo-score]")).toHaveCount(2);
    await context.close();
  });
});

test.describe("/for-patients body map", () => {
  // The selected panel. The one fading out is still on screen for 300 ms, but already marked invisible.
  const panel = (page: Page) => page.locator('[data-body-map] [role="tabpanel"].visible');

  test("buttons, keys and hotspots change the panel", async ({ page }) => {
    await page.goto("/for-patients");
    const tabs = page.getByRole("tablist", { name: "Areas of the body" });
    await tabs.scrollIntoViewIfNeeded();
    await expect(panel(page)).toContainText("Knee rehabilitation");
    await expect(panel(page)).toContainText("FiixBE measures the knee angle.");

    await tabs.getByRole("tab", { name: "Shoulder" }).click();
    await expect(panel(page)).toContainText("Shoulder raises");

    await page.keyboard.press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: "Hip" })).toBeFocused();
    await expect(panel(page)).toContainText("Hip rehabilitation");
    await expect(panel(page)).toContainText("Straight leg raise");

    await page.keyboard.press("ArrowRight");
    await expect(panel(page)).toContainText("Sports injuries");
    await expect(panel(page)).not.toContainText("measures");
    await expect(page.locator('[data-hotspot][data-on="true"]')).toHaveCount(3);

    // A real mouse move over the knee hotspot selects it.
    const knee = page.locator('[data-hotspot="knee"]');
    const box = (await knee.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2 + 1, box.y + box.height / 2);
    await expect(panel(page)).toContainText("Knee rehabilitation");
    await expect(page.locator('[data-hotspot][data-on="true"]')).toHaveCount(1);
  });

  test("a tap on a hotspot selects it, and its hit area is at least 44 px", async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto("/for-patients");
    const shoulder = page.locator('[data-hotspot="shoulder"]');
    await shoulder.scrollIntoViewIfNeeded();
    const box = (await shoulder.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect(panel(page)).toContainText("Shoulder recovery");
    await context.close();
  });
});
