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

  test("picking a patient shows their photo, numbers and flags", async ({ page }) => {
    await page.goto("/for-physios");
    const dash = page.getByRole("region", { name: "Sample physio dashboard" });
    await dash.getByRole("button", { name: /Arjun Mehta/ }).click();
    await expect(dash.getByText("Rotator cuff repair, week 6")).toBeVisible();
    await expect(dash.getByText("Missed 4 sessions this week")).toBeVisible();
    await expect(dash.getByRole("img", { name: "Arjun Mehta doing shoulder raises" })).toBeVisible();
  });
});

test.describe("/for-physios features", () => {
  const PANELS = [
    ["form", "dash", "alerts"],
    ["rx", "report", "msg"],
    ["book", "tele", "multi"],
  ];
  const features = (page: Page) => page.locator("section", { has: page.locator("#physios-features") });
  const visiblePanel = (page: Page) => features(page).locator("[role=tabpanel] [data-panel]:visible");

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
    await expect(section.locator("[data-panel]:visible")).toHaveAttribute("data-panel", "clinics");
    await section.getByRole("tab", { name: /Hospital departments/ }).click();
    await expect(section.locator("[data-panel]:visible")).toHaveAttribute("data-panel", "hospitals");
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
    } finally {
      await context.close();
    }
  });
});
