import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { site } from "@/lib/site";

const PAGES: { path: string; priority: number }[] = [
  { path: "", priority: 1 },
  { path: "/for-patients", priority: 0.8 },
  { path: "/for-physios", priority: 0.8 },
  { path: "/pricing", priority: 0.7 },
  { path: "/session", priority: 0.7 },
  { path: "/blog", priority: 0.6 },
  { path: "/about", priority: 0.5 },
  { path: "/contact", priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  return [
    ...PAGES.map(({ path, priority }) => ({ url: `${site.url}${path}`, priority })),
    ...posts.map((post) => ({ url: `${site.url}/blog/${post.slug}`, lastModified: post.date, priority: 0.6 })),
  ];
}
