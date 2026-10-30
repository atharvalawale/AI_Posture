import { expect, test, type Page } from "@playwright/test";

/** Every video on the page that is playing right now. */
const playingVideos = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("video")].filter((v) => !v.paused && !v.ended && v.readyState > 2).map((v) => v.currentSrc || v.src),
  );

// Without JavaScript, or before it hydrates, the hero is already the final picture: the phone at its size,
// the readout beside or under it, and the summary and the plan as still sections below.
for (const [width, height] of [
  [390, 844],
  [1440, 900],
] as const) {
  test(`without JavaScript the hero phone, its readout and the still chapters show at ${width} px`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height } });
    const page = await context.newPage();
    try {
      await page.goto("/");
      const phone = page.locator('[data-phone="2d"]');
      await expect(phone).toBeVisible();
      const box = await phone.evaluate((el) => {
        const frame = el.closest<HTMLElement>("[data-phone-stage]")!;
        const r = el.getBoundingClientRect();
        let opacity = 1;
        for (let n: Element | null = el; n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
        // The phone body is scaled from its 300 px design width to the stage's --phone-w.
        const body = el.querySelector<HTMLElement>(".bg-device")!.getBoundingClientRect();
        const probe = document.createElement("div");
        probe.style.width = "var(--phone-w)";
        frame.appendChild(probe);
        const phoneW = probe.getBoundingClientRect().width;
        probe.remove();
        return { width: r.width, height: r.height, bodyWidth: body.width, phoneW, opacity };
      });
      expect(box.opacity).toBe(1);
      expect(box.width).toBeGreaterThan(100);
      expect(Math.abs(box.width - box.phoneW)).toBeLessThan(1);
      expect(Math.abs(box.bodyWidth - box.width)).toBeLessThan(1);
      expect(Math.abs(box.height - box.width * 2.1)).toBeLessThan(1);

      // The squat shows as the poster behind the video, which steps aside with its browser controls.
      await expect(page.locator("[data-pose-video]").first()).toBeHidden();
      expect(await page.locator('[data-screen="live"] > div').first().evaluate((el) => getComputedStyle(el).backgroundImage)).toContain(
        "squat-poster",
      );

      // The readout reads the poster frame: Maya standing, her knee at 178°.
      await expect(page.locator("[data-readout-value]")).toHaveText("178");
      await expect(page.locator("[data-stage-rail]")).toBeHidden();
      await expect(page.locator("[data-stage-hint]")).toBeHidden();
      await expect(page.locator("[data-readout-joints]")).toBeHidden();

      for (const chapter of ["summary", "plan"]) {
        const still = page.locator(`[data-still-chapter="${chapter}"]`);
        await still.scrollIntoViewIfNeeded();
        await expect(still).toBeVisible();
      }
      await expect(page.getByRole("heading", { name: "Corrects you out loud" }).filter({ visible: true })).toHaveCount(1);
    } finally {
      await context.close();
    }
  });
}

// WCAG 2.2.2: under reduced motion nothing loops on its own. The squat holds at the bottom of its last rep.
for (const path of ["/", "/for-physios"]) {
  test(`reduced motion: no video plays on its own on ${path}`, async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    try {
      await page.goto(path);
      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < scrollHeight; y += 700) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(400);
        expect(await playingVideos(page)).toEqual([]);
      }
    } finally {
      await context.close();
    }
  });
}

test("reduced motion: the hero holds at the last rep's bottom with the reps before it counted", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await expect(page.locator("[data-phone-stage][data-clip-ready]")).toHaveCount(1, { timeout: 30_000 });
    const video = page.locator('[data-screen="live"] video').first();
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 15_000 }).toBeGreaterThan(20);
    const t = await video.evaluate((v) => (v as HTMLVideoElement).currentTime);
    await page.waitForTimeout(1500);
    expect(await video.evaluate((v) => (v as HTMLVideoElement).currentTime)).toBe(t);
    expect(await video.evaluate((v) => (v as HTMLVideoElement).paused)).toBe(true);
    const reps = page.locator("[data-stage-readout] dt", { hasText: "Reps" }).locator("xpath=following-sibling::dd");
    await expect(reps).toHaveText("2");
  } finally {
    await context.close();
  }
});

test("How it works Practice holds still under reduced motion too", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await page.goto("/");
    const how = page.locator("section#how-it-works");
    await how.scrollIntoViewIfNeeded();
    await how.getByRole("tab", { name: /Practice/ }).click();
    // It shows the squat held at the bottom of the last rep, and never plays.
    const video = how.locator("video");
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 15_000 }).toBeGreaterThan(20);
    await page.waitForTimeout(1500);
    expect(await playingVideos(page)).toEqual([]);
  } finally {
    await context.close();
  }
});

// The cue changes on every phase of every rep. It is announced only while the visitor drives the clip.
test("the readout is quiet while the clip loops and speaks after a step", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-phone-stage][data-clip-ready]")).toHaveCount(1, { timeout: 30_000 });
  const region = page.locator("[data-stage-readout] [aria-live]");
  await expect(region).toHaveCount(1);
  const heard = await region.evaluate(
    (el) =>
      new Promise<string[]>((resolve) => {
        const said: string[] = [];
        const mo = new MutationObserver(() => {
          if (el.textContent) said.push(el.textContent);
        });
        mo.observe(el, { childList: true, characterData: true, subtree: true });
        setTimeout(() => {
          mo.disconnect();
          resolve(said);
        }, 6000);
      }),
  );
  expect(heard).toEqual([]);

  await page.locator("[data-phone-handle]").focus();
  await page.keyboard.press("ArrowRight");
  await expect(region).toHaveText(/^Knee \d+°\. /);
  // A moment later the visitor has stopped, and the region goes quiet again.
  await expect(region).toHaveText("", { timeout: 5000 });
});
