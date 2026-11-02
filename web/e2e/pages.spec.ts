import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const routes = [
  { path: "/for-patients", cta: "/session" },
  { path: "/for-physios", cta: "/contact" },
  { path: "/pricing", cta: "/contact" },
  { path: "/about", cta: "/session" },
] as const;

// Pictographic characters, minus the plain legal marks that fonts render as text.
const emoji = /(?![©®™])\p{Extended_Pictographic}|️/u;

async function bodyText(page: Page) {
  return page.locator("body").innerText();
}

for (const { path, cta } of routes) {
  test.describe(path, () => {
    test("renders with one h1 and a FiixBE title", async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page).toHaveTitle(/ \| FiixBE$/);
    });

    test("copy has no old names, em dashes or emoji", async ({ page }) => {
      await page.goto(path);
      const text = await bodyText(page);
      expect(text).not.toMatch(/PhysioAI/i);
      expect(text).not.toMatch(/Fixbee/i);
      expect(text).not.toContain("—");
      expect(text).not.toMatch(emoji);
      const title = await page.title();
      expect(title).not.toMatch(/PhysioAI|Fixbee|—/i);
    });

    test("mentions the apps only as coming soon", async ({ page }) => {
      await page.goto(path);
      const text = await page.locator("main").innerText();
      expect(text).not.toMatch(/download the app|app store|google play/i);
      expect(text).toContain("iPhone and Android apps coming soon");
    });

    test(`ends with a call to action to ${cta}`, async ({ page }) => {
      await page.goto(path);
      const last = page.locator("main section").last();
      await expect(last.locator(`a[href="${cta}"]`).first()).toBeVisible();
    });

    test("no banned styling", async ({ page }) => {
      await page.goto(path);
      const offenders = await page.evaluate(() =>
        [...document.querySelectorAll("*")]
          .filter((el) => {
            const s = getComputedStyle(el);
            return (
              s.textTransform === "uppercase" ||
              s.backgroundImage.includes("gradient") ||
              (s.textShadow !== "none" && s.textShadow !== "") ||
              parseFloat(s.letterSpacing) > 0.5
            );
          })
          .map((el) => el.outerHTML.slice(0, 120)),
      );
      expect(offenders).toEqual([]);
    });

    for (const colorScheme of ["light", "dark"] as const) {
      test(`no serious or critical axe violations in ${colorScheme}`, async ({ browser }) => {
        const context = await browser.newContext({ colorScheme });
        const page = await context.newPage();
        await page.goto(path);
        await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${colorScheme}\\b`));
        const results = await new AxeBuilder({ page }).analyze();
        const bad = results.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
        expect(bad).toEqual([]);
        await context.close();
      });
    }
  });
}

test.describe("/pricing links", () => {
  test("physio plans link to /contact", async ({ page }) => {
    await page.goto("/pricing");
    for (const plan of ["Solo physio", "Clinic", "Hospital or chain"]) {
      const card = page.getByRole("article", { name: plan });
      await expect(card).toBeVisible();
      await expect(card.getByRole("link")).toHaveAttribute("href", "/contact");
    }
  });

  test("first 50 clinics offer links to /contact", async ({ page }) => {
    await page.goto("/pricing");
    const offer = page.getByText(/first 50 clinics get 3 months free/i);
    await expect(offer).toBeVisible();
    const link = page.getByRole("link", { name: /apply for early access/i });
    await expect(link).toHaveAttribute("href", "/contact");
  });

  test("free patient plan links to the web session", async ({ page }) => {
    await page.goto("/pricing");
    const basic = page.getByRole("article", { name: "Basic" });
    await expect(basic.getByRole("link")).toHaveAttribute("href", "/session");
  });
});

test.describe("/for-physios links", () => {
  test("founding partner call to action goes to /contact", async ({ page }) => {
    await page.goto("/for-physios");
    const links = page.getByRole("link", { name: /founding partner/i });
    await expect(links.first()).toBeVisible();
    for (const href of await links.evaluateAll((els) => els.map((e) => e.getAttribute("href")))) {
      expect(href).toBe("/contact");
    }
  });
});

test.describe("/for-patients links", () => {
  test("try it on the web goes to /session", async ({ page }) => {
    await page.goto("/for-patients");
    const links = page.getByRole("main").getByRole("link", { name: "Try it on the web" });
    await expect(links.first()).toBeVisible();
    for (const href of await links.evaluateAll((els) => els.map((e) => e.getAttribute("href")))) {
      expect(href).toBe("/session");
    }
  });
});
