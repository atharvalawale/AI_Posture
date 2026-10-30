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

test("the 3D phone comes back after navigating away and back", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator('[data-phone="3d"]')).toHaveAttribute("data-ready", "true", { timeout: 60_000 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Pricing" }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);

  await expect(page.locator('[data-phone="3d"]').filter({ visible: true })).toHaveAttribute("data-ready", "true");
  await expect(page.locator("canvas[data-engine]").filter({ visible: true })).toHaveCount(1);
  await scrollStory(page, 0.5);
  await expect(page.getByText("Session complete", { exact: true }).filter({ visible: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("the visitor can turn the phone, see the tracking and jump between screens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator('[data-phone="3d"]')).toHaveAttribute("data-ready", "true", { timeout: 60_000 });
  // The 2D phone stays on top until the 3D one has faded in.
  await expect(page.locator('[data-phone="2d"]')).toHaveCount(0);
  await scrollStory(page, 0.1);

  // A tap on the live screen switches the tracking view on and off.
  const handle = page.locator("[data-phone-handle]");
  const live = page.locator('[data-screen="live"] [data-tracking]');
  await expect(live).toHaveAttribute("data-tracking", "false");
  await handle.click();
  await expect(live).toHaveAttribute("data-tracking", "true");
  await expect(page.getByText("Tap to hide the tracking.")).toBeVisible();
  await handle.click();
  await expect(live).toHaveAttribute("data-tracking", "false");

  // A drag turns the phone; it is not a tap, so the tracking view stays off.
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + box.width / 2 + i * 15, box.y + box.height / 2);
  await expect(handle).toHaveClass(/cursor-grabbing/);
  await page.mouse.up();
  await expect(handle).toHaveClass(/cursor-grab(?!bing)/);
  await expect(live).toHaveAttribute("data-tracking", "false");

  // The chapter rail and the notes scroll the story to their screen.
  const rail = page.getByRole("navigation", { name: "App screens" });
  await rail.getByRole("button", { name: "Plan" }).click();
  await expect(page.getByText("Good morning, Riya", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(rail.getByRole("button", { name: "Plan" })).toHaveAttribute("aria-current", "step");
  await page.getByRole("button", { name: "Corrects you out loud" }).click();
  await expect(page.getByText("Session complete", { exact: true }).filter({ visible: true })).toBeVisible();
});

test("the story releases the pin and the next section follows it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const stage = page.locator("[data-phone-stage]");
  await expect(stage).toHaveAttribute("data-story-end", /\d+/);
  const { start, end, stageTop } = await stage.evaluate((el) => ({
    start: Number((el as HTMLElement).dataset.storyStart),
    end: Number((el as HTMLElement).dataset.storyEnd),
    stageTop: el.getBoundingClientRect().top + window.scrollY,
  }));
  const heading = page.locator("#problem-title");
  const problemTop = await heading.evaluate((el) => el.closest("section")!.getBoundingClientRect().top + window.scrollY);
  // The pin spacer pushes the next section down by the whole story length.
  expect(problemTop - stageTop).toBeGreaterThanOrEqual(end - start);
  await page.evaluate((y) => window.scrollTo(0, y), end + 200);
  await expect(heading).toBeInViewport();
  const covered = await heading.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return !el.contains(document.elementFromPoint(r.left + 8, r.top + r.height / 2));
  });
  expect(covered).toBe(false);
});
