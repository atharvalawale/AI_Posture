import { expect, test } from "@playwright/test";

test.describe("theme", () => {
  test("stored light theme beats dark system theme without flash", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    await context.addInitScript(() => localStorage.setItem("theme", "light"));
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveClass(/\blight\b/);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(246, 246, 243)");
    await context.close();
  });

  test("theme toggle switches and persists", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await expect(page.locator("html")).toHaveClass(/\blight\b/);
  });
});

test.describe("redirects", () => {
  const cases: [string, string][] = [
    ["/index.html", "/"],
    ["/for-physios.html", "/for-physios"],
    ["/for-patients.html", "/for-patients"],
    ["/pricing.html", "/pricing"],
    ["/about.html", "/about"],
    ["/contact.html", "/contact"],
    ["/blog.html", "/blog"],
    ["/session.html", "/session"],
  ];
  for (const [from, to] of cases) {
    test(`${from} redirects to ${to}`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status()).toBe(308);
      expect(res.headers()["location"]).toBe(to);
    });
  }
});

test("no banned styling on the homepage", async ({ page }) => {
  await page.goto("/");
  const offenders = await page.evaluate(() =>
    [...document.querySelectorAll("*")]
      .filter((el) => {
        const s = getComputedStyle(el);
        return s.textTransform === "uppercase" || s.backgroundImage.includes("gradient");
      })
      .map((el) => el.outerHTML.slice(0, 120)),
  );
  expect(offenders).toEqual([]);
});
