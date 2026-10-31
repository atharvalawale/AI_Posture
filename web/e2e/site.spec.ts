import { expect, test } from "@playwright/test";
import slugs from "../src/lib/blog-manifest.json";

// The apex domain redirects to www, so every canonical URL is on www.
const SITE = "https://www.fiixbee.com";
const ROUTES = ["/", "/for-patients", "/for-physios", "/pricing", "/about", "/contact", "/blog", "/session"];

test("sitemap lists every page and every blog post", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  for (const route of ROUTES) expect(xml).toContain(`<loc>${SITE}${route}</loc>`);
  for (const slug of slugs) expect(xml).toContain(`<loc>${SITE}/blog/${slug}</loc>`);
  // Google ignores both, so the sitemap leaves them out.
  expect(xml).not.toContain("<priority>");
  expect(xml).not.toContain("<changefreq>");
});

test("robots allows all and points to the sitemap", async ({ request }) => {
  const txt = await (await request.get("/robots.txt")).text();
  expect(txt).toMatch(/User-Agent: \*/i);
  expect(txt).toMatch(/Allow: \//);
  expect(txt).toMatch(/Disallow: \/api\//);
  expect(txt).toContain(`Sitemap: ${SITE}/sitemap.xml`);
});

test("unknown routes show the custom 404 with a way home", async ({ page }) => {
  for (const path of ["/does-not-exist", "/blog/does-not-exist"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "We could not find that page" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Back to the homepage" })).toHaveAttribute("href", "/");
  }
});

test("every page has a meta description", async ({ page }) => {
  for (const route of [...ROUTES, `/blog/${slugs[0]}`]) {
    await page.goto(route);
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description?.length, route).toBeGreaterThan(40);
  }
});

test("the homepage has a social share image", async ({ page, request }) => {
  await page.goto("/");
  const og = await page.locator('meta[property="og:image"]').first().getAttribute("content");
  expect(og).toBeTruthy();
  const res = await request.get(new URL(og!).pathname);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
});

test("every page has a canonical URL and og:url on the www host", async ({ page }) => {
  for (const route of [...ROUTES, `/blog/${slugs[0]}`]) {
    await page.goto(route);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical, route).toBe(route === "/" ? SITE : `${SITE}${route}`);
    await expect(page.locator('meta[property="og:url"]'), route).toHaveAttribute("content", canonical!);
    await expect(page.locator('meta[property="og:site_name"]'), route).toHaveAttribute("content", "FiixBE");
    await expect(page.locator('meta[property="og:image"]').first(), route).toHaveAttribute("content", /^https:\/\/www\.fiixbee\.com\//);
  }
});

test("the homepage describes the site and the organization", async ({ page }) => {
  await page.goto("/");
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  const types = data["@graph"].map((node: { "@type": string }) => node["@type"]);
  expect(types).toEqual(["WebSite", "Organization"]);
  expect(data["@graph"][0].url).toBe(`${SITE}/`);
  const logo = await page.request.get(new URL(data["@graph"][1].logo).pathname);
  expect(logo.headers()["content-type"]).toBe("image/png");
});

test("the footer sitemap links to every page", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  for (const route of ROUTES.filter((r) => r !== "/")) await expect(footer.locator(`a[href="${route}"]`)).toHaveCount(1);
  await expect(footer.locator('a[href="/#how-it-works"]')).toHaveCount(1);
});

test.describe("cookie banner", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("asks once, remembers the answer and can be reopened", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("region", { name: "Cookies" });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Decline" }).click();
    await expect(banner).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem("fiixbe-analytics-consent"))).toBe("denied");

    await page.reload();
    await expect(banner).toBeHidden();

    await page.getByRole("contentinfo").getByRole("button", { name: "Cookie settings" }).click();
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("You declined them.");
    await banner.getByRole("button", { name: "Allow" }).click();
    await expect(banner).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem("fiixbe-analytics-consent"))).toBe("granted");
  });

  test("sets no analytics cookies before the visitor allows them", async ({ page, context }) => {
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Cookies" })).toBeVisible();
    const cookies = await context.cookies();
    expect(cookies.filter((c) => c.name.startsWith("_ga"))).toEqual([]);
  });
});
