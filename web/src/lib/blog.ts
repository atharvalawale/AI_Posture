import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { z } from "zod";

const CONTENT_DIR = path.join(process.cwd(), "content/blog");
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => {
    const [y, m, d] = s.split("-").map(Number);
    return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
  }, "Not a real date");

const postMetaSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(SLUG),
  description: z.string().min(1),
  category: z.string().min(1),
  date: isoDate,
  readingMinutes: z.number().int().positive(),
  author: z.string().min(1),
  reviewedBy: z.string(),
  featured: z.boolean(),
  image: z.object({
    src: z.string().min(1),
    page: z.url(),
    photographer: z.string().min(1),
    alt: z.string().min(1),
  }),
  sources: z.array(z.object({ title: z.string().min(1), url: z.url() })).min(1),
});

export type PostMeta = z.infer<typeof postMetaSchema>;
export type Post = { meta: PostMeta; html: string };

/** Parses and validates one post file. Throws with the file name on any problem, which fails the build. */
export function parsePost(source: string, fileSlug: string): { meta: PostMeta; body: string } {
  const { data, content } = matter(source);
  const result = postMetaSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid frontmatter in content/blog/${fileSlug}.md:\n${z.prettifyError(result.error)}`);
  }
  if (result.data.slug !== fileSlug) {
    throw new Error(`content/blog/${fileSlug}.md: slug "${result.data.slug}" must match the file name`);
  }
  return { meta: result.data, body: content };
}

function listSlugs(): string[] {
  return readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("."))
    .map((f) => f.slice(0, -3));
}

function readPost(slug: string) {
  return parsePost(readFileSync(path.join(CONTENT_DIR, `${slug}.md`), "utf8"), slug);
}

const markdown = unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeSlug).use(rehypeStringify);

/** Every post, newest first. */
export async function getAllPosts(): Promise<PostMeta[]> {
  "use cache";
  return listSlugs()
    .map((slug) => readPost(slug).meta)
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

/** One post with its body rendered to HTML, or null when no such post exists. */
export async function getPost(slug: string): Promise<Post | null> {
  "use cache";
  if (!SLUG.test(slug) || !existsSync(path.join(CONTENT_DIR, `${slug}.md`))) return null;
  const { meta, body } = readPost(slug);
  const html = String(await markdown.process(body));
  return { meta, html };
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function daysInMonth(year: number, month: number) {
  return [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

/** "2026-10-03" becomes "3 October 2026". Works on the string, so it never reads the clock during prerender. */
export function formatPostDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
