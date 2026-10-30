import { expect, test, type Page } from "@playwright/test";

// Headless Chromium only has WebGL through SwiftShader, which it hides behind a flag.
test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] } });

/**
 * Scrolls so the pinned story sits at `p` (0..1), plus `px`, using the trigger range the stage
 * publishes. Fonts and hydration can still move the range just after load, so it scrolls again
 * until the range holds still.
 */
async function scrollStory(page: Page, p: number, px = 0) {
  const stage = page.locator("[data-phone-stage]");
  await expect(stage).toHaveAttribute("data-story-end", /\d+/);
  await stage.evaluate(
    async (el, [p, px]) => {
      const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const range = () => `${(el as HTMLElement).dataset.storyStart} ${(el as HTMLElement).dataset.storyEnd}`;
      await document.fonts.ready;
      for (let i = 0; i < 10; i++) {
        const before = range();
        const [start, end] = before.split(" ").map(Number);
        window.scrollTo(0, start + (end - start) * p + px);
        await frames();
        if (range() === before) return;
      }
    },
    [p, px],
  );
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
  await expect(title("Good morning, Maya")).toHaveCount(0);

  await scrollStory(page, 0.9);
  await expect(title("Good morning, Maya")).toBeVisible();
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

const currentTime = (page: Page) => liveVideo(page).evaluate((v) => (v as HTMLVideoElement).currentTime);

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
  // Past the tap slop: the scrub starts and pauses the clip, so its time is ours from here.
  await page.mouse.move(x + 10, y);
  expect(await paused(page)).toBe(true);
  const t0 = await currentTime(page);
  // Drag 120 px more, toward whichever end of the 29 s clip has room.
  const dx = t0 < 15 ? 120 : -120;
  // The angle along the way. 120 px is about one squat, so the end angle can match the start one.
  const seen = new Set([before]);
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(x + 10 + (dx * i) / 12, y);
    // The seek, its frame and the readout's render land a moment after the move.
    await page.waitForTimeout(150);
    seen.add(await readout.textContent());
  }
  // Still holding the button: the clip follows the drag and stays paused. On a busy machine each
  // move restarts the pending seek, so the last one may only land after the drag.
  await expect
    .poll(async () => {
      seen.add(await readout.textContent());
      return seen.size;
    })
    .toBeGreaterThan(1);
  expect(await paused(page)).toBe(true);
  // One phone width of drag is 8 s of clip.
  expect(Math.abs((await currentTime(page)) - t0 - (dx / box.width) * 8)).toBeLessThan(0.15);
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

// The layout tests need no 3D. Without WebGL 2 the stage uses the 2D phone (as on a device that
// fails the 3D check), which is far lighter, so these tests do not slow the software WebGL of the
// 3D tests running beside them.
test.describe("stage layout", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        return type === "webgl2" ? null : getContext.call(this, type as "2d", ...(rest as []));
      } as typeof getContext;
    });
  });

  test("desktop columns crossfade with the chapters", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const stage = page.locator("[data-phone-stage]");
    const note = page.getByRole("heading", { name: "Corrects you out loud" });

    await scrollStory(page, 0.5);
    await expect(note).toBeVisible();
    await expect(page.locator("h1")).toBeHidden();
    await expect(stage.locator("[data-readout-value]")).toBeHidden();
    await expect(stage.locator('[data-chapter-details="summary"]')).toBeVisible();

    await scrollStory(page, 0.9);
    await expect(stage.locator('[data-chapter-details="plan"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Keeps your physio close" })).toBeVisible();
    await expect(note).toBeHidden();
    await expect(page.locator("h1")).toHaveCount(1);
  });

  const headerHeight = (page: Page) => page.locator("header").first().evaluate((el) => el.getBoundingClientRect().height);

  test("phone width: copy scrolls away, then the phone and the compact readout pin", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await scrollStory(page, 0, 10);

    const header = await headerHeight(page);
    await expect
      .poll(() => page.locator("[data-stage-frame]").evaluate((el) => el.getBoundingClientRect().top))
      .toBeGreaterThan(header - 2);
    const top = await page.locator("[data-stage-frame]").evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(top - header)).toBeLessThanOrEqual(2);
    await expect(page.locator("h1")).not.toBeInViewport();
    await expect(page.locator("[data-readout-value]")).toBeVisible();
  });

  for (const [width, height] of [
    [360, 640],
    [390, 844],
    [430, 932],
  ] as const) {
    test(`pinned at ${width} x ${height}, the phone, readout, rail and hint fit under the header`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await expect(page.locator("[data-pinned]")).toHaveAttribute("data-pinned", "true");
      const stage = page.locator("[data-phone-stage]");
      await expect(stage).toHaveAttribute("data-story-end", /\d+/);
      const header = await headerHeight(page);
      for (const p of [0.1, 0.5, 0.9]) {
        await scrollStory(page, p);
        // Let the chapter crossfade finish, so the measured layer is the one on show.
        await page.waitForTimeout(400);
        const boxes = await stage.evaluate((el) => {
          const parts = {
            phone: "[data-phone-handle]",
            readout: "[data-stage-readout] > :not([aria-hidden])",
            rail: "nav",
            hint: "[data-stage-hint]",
          };
          const frame = el.querySelector("[data-stage-frame]")!;
          return Object.entries(parts).map(([name, selector]) => {
            const found = frame.querySelectorAll(selector);
            const r = found.length === 1 ? found[0].getBoundingClientRect() : { top: NaN, bottom: NaN };
            return { name, top: r.top, bottom: r.bottom };
          });
        });
        for (const b of boxes) {
          expect(b.top, `${b.name} at ${p}`).toBeGreaterThanOrEqual(header - 1);
          expect(b.bottom, `${b.name} at ${p}`).toBeLessThanOrEqual(height + 1);
        }
      }
    });
  }

  // Landscape phones and the smallest phones: the pinned stack cannot fit under the header, so the
  // stage does not pin and the summary and the plan follow as still sections.
  for (const [width, height] of [
    [320, 568],
    [844, 390],
    [740, 360],
  ] as const) {
    test(`too short to pin at ${width} x ${height}: nothing is hidden under the header or out of reach`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      // The server renders the rail; once the stage finds it does not fit, it drops it.
      await expect(page.locator("[data-pinned]")).toHaveAttribute("data-pinned", "false");
      await expect(page.getByRole("navigation", { name: "App screens" })).toHaveCount(0);
      await expect(page.locator(".pin-spacer")).toHaveCount(0);
      const header = await headerHeight(page);
      const parts = {
        phone: page.locator("[data-phone-handle]"),
        readout: page.locator("[data-stage-readout]"),
        hint: page.locator("[data-stage-hint]"),
        "summary note": page.locator("[data-still-chapter=summary] > div > *").nth(0),
        "summary phone": page.locator("[data-still-chapter=summary] > div > *").nth(1),
        "summary details": page.locator("[data-still-chapter=summary] > div > *").nth(2),
        "plan note": page.locator("[data-still-chapter=plan] > div > *").nth(0),
        "plan phone": page.locator("[data-still-chapter=plan] > div > *").nth(1),
        "plan details": page.locator("[data-still-chapter=plan] > div > *").nth(2),
      };
      for (const [name, part] of Object.entries(parts)) {
        await expect(part, name).toBeVisible();
        // Scroll it to just under the header: all of it shows there (or its top, if it is taller than the view).
        const box = await part.evaluate((el, header) => {
          window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - header);
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, height: r.height };
        }, header);
        expect(box.top, `${name} top`).toBeGreaterThanOrEqual(header - 1);
        if (box.height <= height - header) expect(box.bottom, `${name} bottom`).toBeLessThanOrEqual(height + 1);
      }
    });
  }

  /** Expects the stage pinned (or not) and its phone, readout, rail and hint all inside the view under the header. */
  async function expectPinnedStackFits(page: Page, height: number) {
    const stage = page.locator("[data-phone-stage]");
    await expect(page.locator("[data-pinned]")).toHaveAttribute("data-pinned", "true");
    await expect(page.locator(".pin-spacer")).toHaveCount(1);
    const header = await headerHeight(page);
    for (const p of [0.1, 0.9]) {
      await scrollStory(page, p);
      await page.waitForTimeout(400);
      const boxes = await stage.evaluate((el) => {
        const frame = el.querySelector("[data-stage-frame]")!;
        return ["[data-phone-handle]", "[data-stage-readout] > :not([aria-hidden])", "nav", "[data-stage-hint]"].map((sel) => {
          const r = frame.querySelector(sel)!.getBoundingClientRect();
          return { sel, top: r.top, bottom: r.bottom };
        });
      });
      for (const b of boxes) {
        expect(b.top, `${b.sel} at ${p}`).toBeGreaterThanOrEqual(header - 1);
        expect(b.bottom, `${b.sel} at ${p}`).toBeLessThanOrEqual(height + 1);
      }
    }
  }

  /** Expects the stage unpinned, and its phone, readout and hint each fully reachable under the header by scrolling. */
  async function expectUnpinnedStackReachable(page: Page, height: number) {
    await expect(page.locator("[data-pinned]")).toHaveAttribute("data-pinned", "false");
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "App screens" })).toHaveCount(0);
    const header = await headerHeight(page);
    for (const sel of ["[data-phone-handle]", "[data-stage-readout]", "[data-stage-hint]"]) {
      const box = await page.locator(sel).evaluate((el, header) => {
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - header);
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: r.height };
      }, header);
      expect(box.top, `${sel} top`).toBeGreaterThanOrEqual(header - 1);
      if (box.height <= height - header) expect(box.bottom, `${sel} bottom`).toBeLessThanOrEqual(height + 1);
    }
  }

  test("the pin follows the content: it lets go when the stack outgrows the view, and pins again when it fits", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expectPinnedStackFits(page, 844);
    // The readout grows taller than the room left under the phone (as with larger text or longer copy).
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.addStyleTag({ content: "[data-stage-readout] { padding-bottom: 360px }" });
    await expectUnpinnedStackReachable(page, 844);
    await page.evaluate(() => document.querySelectorAll("style").forEach((s) => s.textContent?.includes("padding-bottom: 360px") && s.remove()));
    await page.evaluate(() => window.scrollTo(0, 0));
    await expectPinnedStackFits(page, 844);
  });

  test("a few pixels either side of where the stack fits, the pin state matches", async ({ page }) => {
    // Short enough that the phone is at its smallest, so the stack's height no longer depends on the view.
    await page.setViewportSize({ width: 390, height: 480 });
    await page.goto("/");
    await expect(page.locator("[data-pinned]")).toHaveAttribute("data-pinned", "false");
    const need = Number(await page.locator("[data-phone-stage]").getAttribute("data-stage-need"));
    const header = await headerHeight(page);
    const fits = Math.ceil(header + need) + 2;

    await page.setViewportSize({ width: 390, height: fits });
    await expectPinnedStackFits(page, fits);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.setViewportSize({ width: 390, height: fits - 5 });
    await expectUnpinnedStackReachable(page, fits - 5);
  });

  test("resize across the desktop breakpoint keeps the pin spacing", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const stage = page.locator("[data-phone-stage]");
    await expect(stage).toHaveAttribute("data-story-end", /\d+/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);

    // The pin re-measures once the resize settles: ScrollTrigger debounces it, and the readout
    // switches to its compact variant on the next render. On a busy machine that can take longer.
    const heading = page.locator("#problem-title");
    await expect
      .poll(async () => {
        const end = Number(await stage.getAttribute("data-story-end"));
        await page.evaluate((y) => window.scrollTo(0, y), end + 200);
        return heading.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const inView = r.top >= 0 && r.bottom <= window.innerHeight;
          return inView && el.contains(document.elementFromPoint(r.left + 8, r.top + r.height / 2));
        });
      })
      .toBe(true);
    await expect(heading).toBeInViewport();
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("reduced motion: the summary and the plan follow the hero as still sections", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    try {
      await page.goto("/");
      const summary = page.getByText("Session complete", { exact: true }).filter({ visible: true });
      const plan = page.getByText(/^Good morning, /).filter({ visible: true });
      await expect(summary).toHaveCount(1);
      await summary.scrollIntoViewIfNeeded();
      await expect(summary).toBeInViewport();
      await plan.scrollIntoViewIfNeeded();
      await expect(plan).toBeInViewport();
      await expect(page.getByRole("heading", { name: "Corrects you out loud" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Keeps your physio close" })).toBeVisible();
      await expect(page.locator(".pin-spacer")).toHaveCount(0);
      await expect(page.locator("h1")).toHaveCount(1);
    } finally {
      await context.close();
    }
  });

  for (const [width, height] of [
    [1280, 720],
    [1440, 900],
    [1920, 1080],
  ] as const) {
    test(`the headline stays on two lines at ${width} x ${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      const lines = await page.locator("h1").evaluate((el) => {
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
        return Math.round(el.getBoundingClientRect().height / lineHeight);
      });
      expect(lines).toBe(2);
    });
  }
});
