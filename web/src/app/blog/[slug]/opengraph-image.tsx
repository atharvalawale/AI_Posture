import { shareCard } from "@/app/_og/card";
import { getPost } from "@/lib/blog";

export { size } from "@/app/_og/card";
export const contentType = "image/png";

export default async function ArticleImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  const meta = post?.meta;
  return shareCard({
    headline: meta?.title ?? "Recovery, explained",
    footnote: meta ? [meta.category, `${meta.readingMinutes} min read`] : ["The FiixBE blog"],
    // Titles run to about 80 characters. This size keeps them to three lines.
    headlineSize: 64,
  });
}
