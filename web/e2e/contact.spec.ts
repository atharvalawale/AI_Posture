import { existsSync, readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const FAILURE = "We could not send your message. Email us at hello@fiixbee.com.";
const SUCCESS = "Thanks, we will reply within one working day.";

// The rate limiter keys on the client address. Each test gets its own so runs never collide.
const uniqueIp = () => `10.${[0, 0, 0].map(() => Math.floor(Math.random() * 250) + 1).join(".")}`;

// Tests that hit the real route expect "no mail provider configured". Never send real mail from tests.
const hasRealKey = [".env.local", ".env.development.local", ".env"].some(
  (f) => existsSync(f) && /^RESEND_API_KEY=\S+/m.test(readFileSync(f, "utf8")),
);

const valid = {
  name: "Asha Rao",
  email: "asha@example.com",
  role: "physiotherapist",
  message: "I run a small clinic and would like to try FiixBE with my patients.",
};

async function fillValid(page: Page) {
  await page.getByLabel("Your name", { exact: true }).fill(valid.name);
  await page.getByLabel("Email", { exact: true }).fill(valid.email);
  await page.getByLabel("I am", { exact: true }).selectOption(valid.role);
  await page.getByLabel("Message", { exact: true }).fill(valid.message);
}

test.describe("contact page", () => {
  test("shows who to contact and the form", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: "hello@fiixbee.com" })).toHaveAttribute(
      "href",
      "mailto:hello@fiixbee.com",
    );
    await expect(page.locator("main").getByText("Pune and Mumbai, India")).toBeVisible();
    await expect(page.getByLabel("I am", { exact: true }).locator("option")).toHaveText([
      "Choose one",
      "A patient",
      "A physiotherapist",
      "A clinic or hospital",
      "Someone else",
    ]);
    await expect(page).toHaveTitle(/Contact/);
  });

  test("shows the success message when the server accepts", async ({ page }) => {
    let posted: unknown;
    await page.route("**/api/contact", async (route) => {
      posted = route.request().postDataJSON();
      await route.fulfill({ status: 200, json: { ok: true } });
    });
    await page.goto("/contact");
    await fillValid(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText(SUCCESS)).toBeVisible();
    expect(posted).toEqual({ ...valid, company: "" });
    await page.getByRole("button", { name: "Send another message" }).click();
    await expect(page.getByLabel("Your name", { exact: true })).toHaveValue("");
  });

  test("shows the fallback that names hello@fiixbee.com when sending fails", async ({ page }) => {
    await page.route("**/api/contact", (route) =>
      route.fulfill({ status: 502, json: { ok: false, error: "provider error" } }),
    );
    await page.goto("/contact");
    await fillValid(page);
    await page.getByRole("button", { name: "Send message" }).click();
    const alert = page.locator("main").getByRole("alert");
    await expect(alert).toHaveText(FAILURE);
    await expect(alert.getByRole("link", { name: "hello@fiixbee.com" })).toHaveAttribute("href", "mailto:hello@fiixbee.com");
    await expect(page.getByText(SUCCESS)).toHaveCount(0);
    // The visitor's text is kept so they can copy it into an email.
    await expect(page.getByLabel("Message", { exact: true })).toHaveValue(valid.message);
  });

  test("shows the fallback when the network fails", async ({ page }) => {
    await page.route("**/api/contact", (route) => route.abort("failed"));
    await page.goto("/contact");
    await fillValid(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText(FAILURE);
  });

  test("shows a sending state while the request is in flight", async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    await page.route("**/api/contact", async (route) => {
      await held;
      await route.fulfill({ status: 200, json: { ok: true } });
    });
    await page.goto("/contact");
    await fillValid(page);
    await page.getByRole("button", { name: "Send message" }).click();
    const sending = page.getByRole("button", { name: "Sending..." });
    await expect(sending).toBeDisabled();
    release();
    await expect(page.getByText(SUCCESS)).toBeVisible();
  });

  test("checks fields in the browser before sending", async ({ page }) => {
    let requests = 0;
    await page.route("**/api/contact", (route) => {
      requests++;
      return route.fulfill({ status: 200, json: { ok: true } });
    });
    await page.goto("/contact");
    await page.getByLabel("Email", { exact: true }).fill("asha@");
    await page.getByRole("button", { name: "Send message" }).click();

    const name = page.getByLabel("Your name", { exact: true });
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toBeFocused();
    await expect(page.getByText("Enter your name.")).toBeVisible();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Choose the option that fits you best.")).toBeVisible();
    await expect(page.getByText("Write at least 10 characters.")).toBeVisible();
    await expect(page.locator("main").getByRole("status")).toContainText("4 fields need attention");
    expect(requests).toBe(0);

    // Fixing a field clears its error.
    await name.fill("Asha");
    await expect(page.getByText("Enter your name.")).toHaveCount(0);
    await expect(name).not.toHaveAttribute("aria-invalid", "true");
  });

  test("hides the honeypot from people and assistive tech", async ({ page }) => {
    await page.goto("/contact");
    const trap = page.locator('input[name="hp_extra"]');
    await expect(trap).toHaveAttribute("tabindex", "-1");
    await expect(trap).toHaveAttribute("autocomplete", "off");
    await expect(page.locator('[aria-hidden="true"]:has(input[name="hp_extra"])')).toHaveCount(1);
    const box = await trap.boundingBox();
    expect(box === null || box.width <= 1 || box.x + box.width <= 0).toBe(true);
  });

  test("without a mail provider, a real submit shows the fallback", async ({ page }) => {
    test.skip(hasRealKey, "A real RESEND_API_KEY is configured; refusing to send real mail from tests.");
    const ip = uniqueIp();
    await page.route("**/api/contact", (route) =>
      route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": ip } }),
    );
    await page.goto("/contact");
    await fillValid(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText(FAILURE);
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`has no accessibility violations in ${scheme} mode, including the error state`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/contact");
      await page.getByRole("button", { name: "Send message" }).click();
      await expect(page.getByText("Enter your name.")).toBeVisible();
      const results = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
    });
  }

  test("uses no banned styling", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: "Send message" }).click();
    const offenders = await page.evaluate(() =>
      [...document.querySelectorAll("main *")]
        .filter((el) => {
          const s = getComputedStyle(el);
          return s.textTransform === "uppercase" || s.backgroundImage.includes("gradient") || s.textShadow !== "none";
        })
        .map((el) => el.outerHTML.slice(0, 120)),
    );
    expect(offenders).toEqual([]);
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/—|PhysioAI|Fixbee/);
  });
});

test.describe("contact API", () => {
  test("rejects invalid input with 400", async ({ request }) => {
    const res = await request.post("/api/contact", {
      data: { ...valid, email: "nope" },
      headers: { "x-forwarded-for": uniqueIp() },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe("string");
  });

  test("rejects a body that is not JSON with 400", async ({ request }) => {
    const res = await request.post("/api/contact", {
      data: "name=x",
      headers: { "content-type": "text/plain", "x-forwarded-for": uniqueIp() },
    });
    expect(res.status()).toBe(400);
  });

  test("accepts a honeypot hit silently", async ({ request }) => {
    const res = await request.post("/api/contact", {
      data: { ...valid, company: "Spam Inc" },
      headers: { "x-forwarded-for": uniqueIp() },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  test("returns 502 when no mail provider is configured", async ({ request }) => {
    test.skip(hasRealKey, "A real RESEND_API_KEY is configured.");
    const res = await request.post("/api/contact", { data: valid, headers: { "x-forwarded-for": uniqueIp() } });
    expect(res.status()).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: FAILURE });
  });

  test("limits each address to 5 requests in 10 minutes", async ({ request }) => {
    const ip = uniqueIp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request.post("/api/contact", { data: { ...valid, company: "x" }, headers: { "x-forwarded-for": ip } });
      statuses.push(res.status());
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });
});

test.describe("newsletter API", () => {
  test("rejects an invalid email with 400", async ({ request }) => {
    const res = await request.post("/api/newsletter", { data: { email: "nope" }, headers: { "x-forwarded-for": uniqueIp() } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe("string");
  });

  test("accepts a honeypot hit silently", async ({ request }) => {
    const res = await request.post("/api/newsletter", {
      data: { email: "bot@example.com", company: "x" },
      headers: { "x-forwarded-for": uniqueIp() },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  test("returns 502 naming hello@fiixbee.com when no provider is configured", async ({ request }) => {
    test.skip(hasRealKey, "A real RESEND_API_KEY is configured.");
    const res = await request.post("/api/newsletter", {
      data: { email: "reader@example.com" },
      headers: { "x-forwarded-for": uniqueIp() },
    });
    expect(res.status()).toBe(502);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain("hello@fiixbee.com");
  });

  test("limits each address to 5 requests in 10 minutes", async ({ request }) => {
    const ip = uniqueIp();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request.post("/api/newsletter", { data: { email: "nope" }, headers: { "x-forwarded-for": ip } });
      statuses.push(res.status());
    }
    expect(statuses).toEqual([400, 400, 400, 400, 400, 429]);
  });
});
