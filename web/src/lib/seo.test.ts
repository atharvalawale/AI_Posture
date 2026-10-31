import { describe, expect, it } from "vitest";
import { pageMetadata } from "./seo";

describe("pageMetadata", () => {
  it("leaves out an unset title and description so the layout defaults apply", () => {
    const meta = pageMetadata({ path: "/" });
    expect("title" in meta).toBe(false);
    expect("description" in meta).toBe(false);
    expect(meta.alternates?.canonical).toBe("/");
  });

  it("keeps the shared OpenGraph fields when a page sets its own", () => {
    const meta = pageMetadata({ title: "Blog", description: "Posts", path: "/blog", openGraph: { title: "FiixBE blog" } });
    expect(meta.openGraph).toMatchObject({ siteName: "FiixBE", locale: "en_IN", url: "/blog", title: "FiixBE blog" });
  });

  it("uses a page's own share card when it has one", () => {
    const meta = pageMetadata({ path: "/blog/a", image: { url: "/blog/a/opengraph-image", alt: "A" } });
    expect(meta.openGraph?.images).toEqual([expect.objectContaining({ url: "/blog/a/opengraph-image", alt: "A", width: 1200 })]);
  });
});
