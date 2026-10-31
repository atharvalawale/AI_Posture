import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/seo";

// Google ignores priority and changefreq, and only trusts lastmod when it is accurate,
// so pages without a real modified date leave it out.
const PAGES = ["/", "/for-patients", "/for-physios", "/pricing", "/session", "/about", "/contact"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  return [
    ...PAGES.map((path) => ({ url: absoluteUrl(path) })),
    { url: absoluteUrl("/blog"), lastModified: posts[0]?.date },
    ...posts.map((post) => ({ url: absoluteUrl(`/blog/${post.slug}`), lastModified: post.date })),
  ];
}
