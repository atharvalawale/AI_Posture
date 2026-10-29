import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const APPS = "iPhone and Android apps coming soon.";

test("hero, calls to action and sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("See every degree of your recovery.");
  await expect(page.getByRole("link", { name: "Start your recovery" }).first()).toHaveAttribute("href", "/session");
  await expect(page.getByRole("main").getByRole("link", { name: "For physiotherapists" }).first()).toHaveAttribute("href", "/for-physios");
  await expect(page.getByText(APPS).first()).toBeVisible();
  await expect(page.locator("section#how-it-works")).toHaveCount(1);
  const text = (await page.locator("main").textContent()) ?? "";
  expect(text).not.toMatch(/PhysioAI|Fixbee|—|\p{Extended_Pictographic}/u);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`no serious accessibility violations in ${colorScheme} mode`, async ({ browser }) => {
    // Reduced motion: no pin, every section in normal flow, so axe sees the whole page.
    const context = await browser.newContext({ colorScheme, reducedMotion: "reduce" });
    const page = await context.newPage();
    try {
      await page.goto("/");
      await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${colorScheme}\\b`));
      const { violations } = await new AxeBuilder({ page }).analyze();
      const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
