import { expect, test, type Page } from "@playwright/test";

// Headless Chromium only has WebGL through SwiftShader, which it hides behind a flag.
test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] } });

/** Scrolls so the pinned story sits at `p` (0..1), using the trigger range the stage publishes. */
async function scrollStory(page: Page, p: number) {
  const stage = page.locator("[data-phone-stage]");
  await expect(stage).toHaveAttribute("data-story-end", /\d+/);
  await stage.evaluate((el, p) => {
    const start = Number((el as HTMLElement).dataset.storyStart);
    const end = Number((el as HTMLElement).dataset.storyEnd);
    window.scrollTo(0, start + (end - start) * p);
  }, p);
}

test("reduced motion: no 3D, the 2D phone is face-on and not pinned", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await page.goto("/");
    const phone = page.locator('[data-phone="2d"]');
    await expect(phone).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(page.locator("canvas[data-engine]")).toHaveCount(0);
    expect(await phone.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    // All four notes are readable at once.
    for (const title of ["Counts every rep", "Measures your joints", "Corrects you out loud", "Keeps your physio close"]) {
      await expect(page.getByText(title, { exact: true }).filter({ visible: true })).toHaveCount(1);
    }
  } finally {
    await context.close();
  }
});

test("3D phone loads and the scroll story walks through the three screens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("canvas[data-engine]")).toHaveCount(1, { timeout: 60_000 });
  await expect(page.locator('[data-phone="3d"]')).toHaveAttribute("data-ready", "true", { timeout: 60_000 });
  await expect(page.locator('[data-phone="2d"]')).toHaveCount(0);

  const title = (text: string) => page.getByText(text, { exact: true }).filter({ visible: true });

  await scrollStory(page, 0.1);
  await expect(page.locator('[data-screen="live"]').filter({ visible: true })).toHaveCount(1);
  await expect(title("Session complete")).toHaveCount(0);

  await scrollStory(page, 0.5);
  await expect(title("Session complete")).toBeVisible();
  await expect(title("Good morning, Riya")).toHaveCount(0);

  await scrollStory(page, 0.9);
  await expect(title("Good morning, Riya")).toBeVisible();
  await expect(title("Session complete")).toHaveCount(0);
});
