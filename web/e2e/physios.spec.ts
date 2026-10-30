import { expect, test } from "@playwright/test";
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
