import { expect, test } from "@playwright/test";
import slugs from "../src/lib/blog-manifest.json";

const ROUTES = ["/", "/for-patients", "/for-physios", "/pricing", "/about", "/contact", "/blog", "/session"];

test("sitemap lists every page and every blog post", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  for (const route of ROUTES) expect(xml).toContain(`<loc>https://fiixbee.com${route === "/" ? "" : route}</loc>`);
  for (const slug of slugs) expect(xml).toContain(`<loc>https://fiixbee.com/blog/${slug}</loc>`);
});

test("robots allows all and points to the sitemap", async ({ request }) => {
  const txt = await (await request.get("/robots.txt")).text();
  expect(txt).toMatch(/User-Agent: \*/i);
  expect(txt).toMatch(/Allow: \//);
  expect(txt).toContain("Sitemap: https://fiixbee.com/sitemap.xml");
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
