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
    await expect(page.locator("[data-readout-value]")).toBeVisible();
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

const liveVideo = (page: Page) => page.locator('[data-screen="live"] video');
const paused = (page: Page) => liveVideo(page).evaluate((v) => (v as HTMLVideoElement).paused);

/** Waits until the clip is playing and the readout shows a number. */
async function readoutLive(page: Page) {
  await expect(page.locator("[data-readout-value]")).toHaveText(/^\d+$/, { timeout: 30_000 });
}

test("scrubbing the phone changes the angle readout", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator('[data-phone="3d"]')).toHaveAttribute("data-ready", "true", { timeout: 60_000 });
  await expect(page.locator('[data-phone="2d"]')).toHaveCount(0);
  await readoutLive(page);
  const readout = page.locator("[data-readout-value]");
  const before = await readout.textContent();

  const box = (await page.locator("[data-phone-handle]").boundingBox())!;
  const x = box.x + box.width * 0.3;
  const y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 120, y, { steps: 12 });
  // Still holding the button: the clip follows the drag and stays paused.
  await expect(readout).not.toHaveText(before!);
  expect(await paused(page)).toBe(true);
  await page.waitForTimeout(400);
  expect(await paused(page)).toBe(true);

  await page.mouse.up();
  await page.waitForTimeout(1500);
  expect(await paused(page)).toBe(false);
});

test("a tap near the hip switches the readout to Hip", async ({ browser }) => {
  // The 2D phone is face-on under reduced motion, so the screen geometry is exact.
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await readoutLive(page);
    await expect(page.locator("[data-readout-joint]")).toHaveText("Knee");
    await page.locator("[data-phone-handle]").focus();
    await page.keyboard.press("ArrowRight");

    const hip = await liveVideo(page).evaluate(async (el) => {
      const v = el as HTMLVideoElement;
      const t = v.currentTime;
      const r = v.getBoundingClientRect();
      const clip = (await (await fetch("/media/squat.pose.json")).json()) as {
        fps: number; step: number; w: number; h: number; k: number[]; n: number; p: number[];
      };
      // Landmark 23 (left hip) at time t, as keypoint() in lib/pose/clip.ts does it.
      const slot = clip.k.indexOf(23);
      const f = Math.max(0, (t * clip.fps) / clip.step);
      const i = Math.min(Math.floor(f), clip.n - 1);
      const j = Math.min(i + 1, clip.n - 1);
      const a = i === j ? 0 : f - i;
      const stride = clip.k.length * 2;
      const at = (k: number, o: number) => clip.p[k * stride + slot * 2 + o] / 1000;
      const nx = at(i, 0) * (1 - a) + at(j, 0) * a;
      const ny = at(i, 1) * (1 - a) + at(j, 1) * a;
      // object-fit: cover, centered.
      const s = Math.max(r.width / clip.w, r.height / clip.h);
      const ox = (r.width - clip.w * s) / 2;
      const oy = (r.height - clip.h * s) / 2;
      return { x: r.left + ox + nx * clip.w * s, y: r.top + oy + ny * clip.h * s };
    });

    await page.mouse.click(hip.x, hip.y);
    await expect(page.locator("[data-readout-joint]")).toHaveText("Hip");
  } finally {
    await context.close();
  }
});

test("keyboard steps and cycles the joint", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await readoutLive(page);
    const handle = page.locator("[data-phone-handle]");
    await handle.focus();
    await expect(handle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-readout-joint]")).toHaveText("Hip");
    await page.keyboard.press("ArrowRight");
    expect(await paused(page)).toBe(true);
  } finally {
    await context.close();
  }
});

test("vertical swipes still scroll", async ({ page }) => {
  await page.goto("/");
  const handle = page.locator("[data-phone-handle]");
  await expect(handle).toHaveCount(1);
  expect(await handle.evaluate((el) => getComputedStyle(el).touchAction)).toBe("pan-y");
});

test("the chapter rail scrolls the story to the plan", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator('[data-phone="3d"]')).toHaveAttribute("data-ready", "true", { timeout: 60_000 });
  await expect(page.locator('[data-phone="2d"]')).toHaveCount(0);
  const plan = page.getByRole("navigation", { name: "App screens" }).getByRole("button", { name: "Plan" });
  await plan.click();
  await expect(page.getByText(/^Good morning, /).filter({ visible: true })).toBeVisible();
  await expect(plan).toHaveAttribute("aria-current", "step");
});
