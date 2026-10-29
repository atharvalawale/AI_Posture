// @vitest-environment node
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatPostDate, getAllPosts, getPost, parsePost } from "./blog";

const dir = path.join(process.cwd(), "content/blog");
const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
const emoji = /\p{Extended_Pictographic}/u;

describe("blog content", () => {
  it("has posts", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("parses every file in content/blog", async () => {
    const posts = await getAllPosts();
    expect(posts).toHaveLength(files.length);
  });

  it("has unique slugs that match the file names", async () => {
    const posts = await getAllPosts();
    const slugs = posts.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect([...slugs].sort()).toEqual(files.map((f) => f.replace(/\.md$/, "")).sort());
  });

  it("has exactly one featured post", async () => {
    const posts = await getAllPosts();
    expect(posts.filter((p) => p.featured)).toHaveLength(1);
  });

  it("sorts posts newest first", async () => {
    const dates = (await getAllPosts()).map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("has at least 3 sources on every post", async () => {
    for (const post of await getAllPosts()) {
      expect(post.sources.length, post.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it("self-hosts every post image", async () => {
    for (const post of await getAllPosts()) {
      expect(post.image.src, post.slug).toBe(`/images/blog/${post.slug}.webp`);
      expect(existsSync(path.join(process.cwd(), "public", post.image.src)), post.slug).toBe(true);
      expect(post.image.page, post.slug).toMatch(/^https:\/\/unsplash\.com\/photos\//);
    }
  });

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    it(`${slug}: body has no em dash, emoji or banned brand names`, async () => {
      const post = await getPost(slug);
      expect(post).not.toBeNull();
      const html = post!.html;
      expect(html).not.toContain("—");
      expect(html).not.toMatch(emoji);
      expect(html).not.toMatch(/PhysioAI|Fixbee/);
      expect(post!.meta.title).not.toContain("—");
    });
  }
});

describe("getPost", () => {
  it("returns null for an unknown slug", async () => {
    expect(await getPost("does-not-exist")).toBeNull();
  });

  it("rejects slugs that try to leave the content folder", async () => {
    expect(await getPost("../package")).toBeNull();
  });

  it("renders headings with ids", async () => {
    const post = await getPost("home-exercise-adherence");
    expect(post!.html).toMatch(/<h2 id="[a-z0-9-]+">/);
  });
});

describe("parsePost", () => {
  const valid = `---
title: "A title"
slug: "a-title"
description: "A description."
category: "Posture"
date: "2026-10-13"
readingMinutes: 7
author: "FiixBE Clinical Team"
reviewedBy: ""
featured: false
image:
  src: "/images/blog/a-title.webp"
  page: "https://unsplash.com/photos/x"
  photographer: "Someone"
  alt: "Alt text"
sources:
  - title: "One"
    url: "https://example.com/1"
---
Body`;

  it("accepts valid frontmatter", () => {
    expect(parsePost(valid, "a-title").meta.title).toBe("A title");
  });

  it("fails on a missing field", () => {
    expect(() => parsePost(valid.replace('category: "Posture"\n', ""), "a-title")).toThrow(/a-title/);
  });

  it("fails on a bad date", () => {
    expect(() => parsePost(valid.replace("2026-10-13", "13 Oct 2026"), "a-title")).toThrow(/a-title/);
  });

  it("fails when the slug does not match the file name", () => {
    expect(() => parsePost(valid, "other-name")).toThrow(/other-name/);
  });
});

describe("formatPostDate", () => {
  it("formats an ISO date without the clock", () => {
    expect(formatPostDate("2026-10-03")).toBe("3 October 2026");
  });
});
