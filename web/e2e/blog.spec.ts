import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import matter from "gray-matter";

type Post = { slug: string; title: string; featured: boolean; date: string; reviewedBy: string };

const dir = path.join(process.cwd(), "content/blog");
const posts: Post[] = readdirSync(dir)
  .filter((f) => f.endsWith(".md") && !f.startsWith("."))
  .map((f) => matter(readFileSync(path.join(dir, f), "utf8")).data as Post)
  .sort((a, b) => b.date.localeCompare(a.date));
const featured = posts.find((p) => p.featured)!;

test.describe("blog index", () => {
  test("shows the featured post first and links to every post", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const articleLinks = page.locator("main a[href^='/blog/']");
    await expect(articleLinks.first()).toHaveAttribute("href", `/blog/${featured.slug}`);
    const hrefs = await articleLinks.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    for (const post of posts) {
      expect(hrefs, post.slug).toContain(`/blog/${post.slug}`);
    }
  });
});

test.describe("article pages", () => {
  for (const post of posts) {
    test(`${post.slug} has its title, sources and disclaimer`, async ({ page }) => {
      const res = await page.goto(`/blog/${post.slug}`);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(post.title);
      await expect(page.getByRole("heading", { name: "Sources", exact: true })).toBeVisible();
      await expect(page.getByText("FiixBE Clinical Team")).toBeVisible();
      await expect(page.getByText("general information, not medical advice")).toBeVisible();
      await expect(page.locator("main a[href='/session']").first()).toBeVisible();
      if (!post.reviewedBy) await expect(page.getByText(/Reviewed by/)).toHaveCount(0);
      else await expect(page.getByRole("link", { name: post.reviewedBy })).toHaveAttribute("href", "/about#about-team");
    });
  }

  test("shares a small PNG card and describes the article for search", async ({ page }) => {
    await page.goto(`/blog/${featured.slug}`);
    const og = await page.locator("meta[property='og:image']").first().getAttribute("content");
    expect(og).toContain(`/blog/${featured.slug}/opengraph-image`);
    const image = await page.request.get(new URL(og!).pathname + new URL(og!).search);
    expect(image.headers()["content-type"]).toBe("image/png");
    // WhatsApp drops link previews whose image is over about 300 KB.
    expect((await image.body()).length).toBeLessThan(300_000);
    await expect(page).toHaveTitle(new RegExp(featured.title.slice(0, 20)));

    const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    const [article, breadcrumbs] = data["@graph"];
    expect(article["@type"]).toBe("BlogPosting");
    expect(article.headline).toBe(featured.title);
    expect(article.datePublished).toBe(featured.date);
    expect(breadcrumbs["@type"]).toBe("BreadcrumbList");
  });

  test("unknown slug returns 404", async ({ page }) => {
    const res = await page.goto("/blog/does-not-exist");
    expect(res?.status()).toBe(404);
  });
});

test.describe("newsletter form", () => {
  async function submit(page: Page, email: string) {
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Subscribe" }).click();
  }

  test("posts the email and shows success", async ({ page }) => {
    let body: unknown;
    await page.route("**/api/newsletter", async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 200, json: { ok: true } });
    });
    await page.goto("/blog");
    await submit(page, "reader@example.com");
    await expect(page.getByText("You are on the list.")).toBeVisible();
    expect(body).toEqual({ email: "reader@example.com", company: "" });
  });

  test("shows the server's validation error under the field", async ({ page }) => {
    await page.route("**/api/newsletter", (route) =>
      route.fulfill({ status: 400, json: { ok: false, error: "Enter a valid email address." } }),
    );
    await page.goto("/blog");
    await submit(page, "reader@example.com");
    const error = page.getByText("Enter a valid email address.");
    await expect(error).toBeVisible();
    await expect(page.getByLabel("Email address")).toHaveAttribute("aria-invalid", "true");
  });

  test("shows the rate limit message", async ({ page }) => {
    await page.route("**/api/newsletter", (route) => route.fulfill({ status: 429, json: { ok: false } }));
    await page.goto("/blog");
    await submit(page, "reader@example.com");
    await expect(page.getByText("Too many attempts. Try again in a few minutes.")).toBeVisible();
  });

  test("shows the fallback message on a 502", async ({ page }) => {
    await page.route("**/api/newsletter", (route) => route.fulfill({ status: 502, json: { ok: false } }));
    await page.goto("/blog");
    await submit(page, "reader@example.com");
    await expect(page.getByText("We could not add you right now. Email hello@fiixbee.com.")).toBeVisible();
  });

  test("shows the fallback message on a network error", async ({ page }) => {
    await page.route("**/api/newsletter", (route) => route.abort());
    await page.goto("/blog");
    await submit(page, "reader@example.com");
    await expect(page.getByText("We could not add you right now. Email hello@fiixbee.com.")).toBeVisible();
  });

  test("keeps the honeypot hidden from people", async ({ page }) => {
    await page.goto("/blog");
    const trap = page.locator("input[name='company']");
    await expect(trap).toHaveAttribute("tabindex", "-1");
    await expect(page.locator("[aria-hidden='true']:has(input[name='company'])")).toHaveCount(1);
    await expect(trap).not.toBeInViewport();
  });
});
