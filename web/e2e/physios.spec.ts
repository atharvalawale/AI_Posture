import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PoseClip } from "../src/lib/pose/clip";
import { findReps } from "../src/lib/pose/score";

const clip = JSON.parse(readFileSync(resolve(__dirname, "../public/media/squat.pose.json"), "utf8")) as PoseClip;

test.describe("/for-physios dashboard", () => {
  test("physio target slider changes the reached count", async ({ page }) => {
    await page.goto("/for-physios");
    const dash = page.getByRole("region", { name: "Sample physio dashboard" });
    await expect(dash.getByText("2 of 3 reached your target")).toBeVisible();
    const slider = dash.getByRole("slider");
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveValue("102");
    await expect(dash.getByText("3 of 3 reached your target")).toBeVisible();
    await expect(dash.getByText("Every rep reached your target")).toBeVisible();
  });

  test("a rep bar loops that rep in the replay", async ({ page }) => {
    const rep = findReps(clip)[1];
    await page.goto("/for-physios");
    const dash = page.getByRole("region", { name: "Sample physio dashboard" });
    const video = dash.locator("video");
    await expect(dash.getByText("2 of 3 reached your target")).toBeVisible();
    await dash.getByRole("button", { name: /^Rep 2, / }).click();
    await expect(dash.getByText("Replaying rep 2.")).toBeVisible();
    const now = () => video.evaluate((v: HTMLVideoElement) => v.currentTime);
    await expect.poll(now).toBeGreaterThan(rep.start - 0.1);
    // Over a few seconds the playhead keeps playing, and stays inside rep 2.
    const times: number[] = [];
    for (let i = 0; i < 16; i++) {
      times.push(await now());
      await page.waitForTimeout(250);
    }
    expect(Math.max(...times)).toBeGreaterThan(Math.min(...times));
    for (const t of times) {
      expect(t).toBeGreaterThanOrEqual(rep.start - 0.1);
      expect(t).toBeLessThanOrEqual(rep.end + 0.5);
    }
    await dash.getByRole("button", { name: "Play all" }).click();
    await expect(dash.getByText("Pick a rep to replay it.")).toBeVisible();
  });

  test("picking a patient shows their photo, their own measure and their target", async ({ page }) => {
    await page.goto("/for-physios");
    const dash = page.getByRole("region", { name: "Sample physio dashboard" });
    await expect(dash.getByText("2 of 3 reached your target")).toBeVisible();
    await dash.getByRole("button", { name: /Arjun Mehta/ }).click();
    await expect(dash.getByText("Rotator cuff repair, week 6")).toBeVisible();
    await expect(dash.getByText("Highest left arm raise per rep")).toBeVisible();
    await expect(dash.getByText("Deepest knee bend per rep")).toHaveCount(0);
    await expect(dash.getByRole("slider", { name: "Your target for Arjun" })).toHaveValue("90");
    await expect(dash.getByText("Missed 4 sessions this week")).toBeVisible();
    await expect(dash.getByText("Rep 2 stopped short of your target")).toBeVisible();

    // The photo shows at its own 4:3 shape, on the page's surface, with no black bands.
    const photo = dash.getByRole("img", { name: "Arjun Mehta doing shoulder raises" });
    await expect(photo).toBeVisible();
    const box = (await photo.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(4 / 3, 1);
    const [natural, rendered] = await photo.evaluate(async (img: HTMLImageElement) => {
      await img.decode();
      return [img.naturalWidth / img.naturalHeight, img.clientWidth / img.clientHeight];
    });
    expect(rendered).toBeCloseTo(natural, 1);
  });

  for (const width of [390, 768, 1440]) {
    test(`switching patients at ${width} px keeps the measure, slider and flags in place`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      try {
        await page.goto("/for-physios");
        const dash = page.getByRole("region", { name: "Sample physio dashboard" });
        await expect(dash.getByText("2 of 3 reached your target")).toBeVisible();
        // Offsets from the patient's name to the slider and to the flags, which must not move between patients.
        const offsets = async () => {
          const name = (await dash.locator("p.font-serif").first().boundingBox())!;
          const slider = (await dash.getByRole("slider").boundingBox())!;
          const flags = (await dash.getByText("Worth a look").boundingBox())!;
          return [Math.round(slider.y - name.y), Math.round(flags.y - name.y)];
        };
        const maya = await offsets();
        for (const name of ["Arjun Mehta", "Rohan Kulkarni"]) {
          await dash.getByRole("button", { name: new RegExp(name) }).click();
          await expect(dash.locator("p.font-serif").first()).toHaveText(name);
          expect(await offsets()).toEqual(maya);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      } finally {
        await context.close();
      }
    });
  }
});

test.describe("/for-physios features", () => {
  const PANELS = [
    ["form", "dash", "alerts"],
    ["rx", "report", "msg"],
    ["book", "tele", "multi"],
  ];
  const features = (page: Page) => page.locator("section", { has: page.locator("#physios-features") });
  const visiblePanel = (page: Page) => features(page).locator("[role=tabpanel]:not([inert]) > [data-panel]");

  test("feature tabs and cards change the panel with mouse, keyboard and tap", async ({ page, browser }) => {
    await page.goto("/for-physios");
    const section = features(page);
    const tabs = section.getByRole("tablist", { name: "Features" }).getByRole("tab");
    await expect(tabs).toHaveCount(3);

    for (let t = 0; t < 3; t++) {
      await tabs.nth(t).click();
      await expect(tabs.nth(t)).toHaveAttribute("aria-selected", "true");
      const cards = section.getByRole("tablist").nth(1).getByRole("tab");
      // A new tab starts again at its first card.
      await expect(cards.first()).toHaveAttribute("aria-selected", "true");
      await expect(visiblePanel(page)).toHaveAttribute("data-panel", PANELS[t][0]);
      for (let c = 0; c < 3; c++) {
        await cards.nth(c).hover();
        await expect(visiblePanel(page)).toHaveAttribute("data-panel", PANELS[t][c]);
      }
    }

    // Keyboard: focus the first card of the current tab, then arrow to the second.
    await tabs.first().click();
    const cards = section.getByRole("tablist").nth(1).getByRole("tab");
    await cards.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(cards.nth(1)).toBeFocused();
    await expect(visiblePanel(page)).toHaveAttribute("data-panel", "dash");

    // The tabs themselves follow the arrow keys too.
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(visiblePanel(page)).toHaveAttribute("data-panel", "rx");

    // Touch: a tap on the third card shows its panel.
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    const phone = await context.newPage();
    try {
      await phone.goto("/for-physios");
      const s = features(phone);
      const phoneCards = s.getByRole("tablist").nth(1).getByRole("tab");
      await phoneCards.nth(2).tap();
      await expect(visiblePanel(phone)).toHaveAttribute("data-panel", "alerts");
      await s.getByRole("tab", { name: "Run your practice" }).tap();
      await expect(visiblePanel(phone)).toHaveAttribute("data-panel", "book");
      await phoneCards.nth(2).tap();
      await expect(visiblePanel(phone)).toHaveAttribute("data-panel", "multi");
    } finally {
      await context.close();
    }
  });

  test("practices change the panel", async ({ page }) => {
    await page.goto("/for-physios");
    const section = page.locator("section", { has: page.locator("#physios-practices") });
    await expect(section.locator("[role=tabpanel]:not([inert]) > [data-panel]")).toHaveAttribute("data-panel", "clinics");
    await section.getByRole("tab", { name: /Hospital departments/ }).click();
    await expect(section.locator("[role=tabpanel]:not([inert]) > [data-panel]")).toHaveAttribute("data-panel", "hospitals");
    await expect(section.getByText("Discharged, exercising at home")).toBeVisible();
  });

  test("feature tab row scrolls sideways on phones without moving the page", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    try {
      await page.goto("/for-physios");
      const list = page.getByRole("tablist", { name: "Features" });
      const [scrollW, clientW] = await list.evaluate((el) => [el.scrollWidth, el.clientWidth]);
      expect(scrollW).toBeGreaterThan(clientW);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      // The row runs into the gutter, edge to edge, so a cut tab runs off the screen.
      const box = (await list.boundingBox())!;
      expect([box.x, box.width]).toEqual([0, 390]);
    } finally {
      await context.close();
    }
  });

  test("every feature and practice panel fits its frame on phones", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    try {
      await page.goto("/for-physios");
      await expect(page.getByText("2 of 3 reached your target")).toBeVisible();
      const section = features(page);
      const tabs = section.getByRole("tablist", { name: "Features" }).getByRole("tab");
      const fits = (panel: ReturnType<typeof page.locator>) =>
        panel.evaluate((el) => {
          const cs = getComputedStyle(el);
          const room = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
          return [...el.children].every((c) => (c as HTMLElement).offsetHeight <= room);
        });
      for (let t = 0; t < 3; t++) {
        await tabs.nth(t).click();
        const cards = section.getByRole("tablist").nth(1).getByRole("tab");
        for (let c = 0; c < 3; c++) {
          await cards.nth(c).click();
          const panel = visiblePanel(page);
          await expect(panel).toHaveAttribute("data-panel", PANELS[t][c]);
          expect(await fits(panel), PANELS[t][c]).toBe(true);
        }
      }
      const practices = page.locator("section", { has: page.locator("#physios-practices") });
      for (const name of ["Standalone clinics", "Hospital departments", "Independent physios"]) {
        await practices.getByRole("tab", { name: new RegExp(name) }).click();
        const panel = practices.locator("[role=tabpanel]:not([inert]) > [data-panel]");
        expect(await fits(panel), name).toBe(true);
      }
    } finally {
      await context.close();
    }
  });
});
