import { formatPostDate, type PostMeta } from "@/lib/blog";

/** "Rehabilitation · 21 October 2026 · 7 min read" */
export function PostMetaLine({ post, className }: { post: PostMeta; className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted ${className ?? ""}`}>
      <span className="text-text">{post.category}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={post.date}>{formatPostDate(post.date)}</time>
      <span aria-hidden="true">·</span>
      <span>{post.readingMinutes} min read</span>
    </p>
  );
}
