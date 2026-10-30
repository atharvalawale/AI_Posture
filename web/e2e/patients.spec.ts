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
