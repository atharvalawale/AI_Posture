import { formatPostDate, type PostMeta } from "@/lib/blog";

/** "Rehabilitation · 21 October 2026 · 7 min read". Each separator wraps with the item after it. */
export function PostMetaLine({ post, className }: { post: PostMeta; className?: string }) {
  const sep = (
    <span aria-hidden="true" className="px-2">
      ·
    </span>
  );
  return (
    <p className={`flex flex-wrap items-center gap-y-1 text-sm text-muted ${className ?? ""}`}>
      <span className="text-text">{post.category}</span>
      <span className="whitespace-nowrap">
        {sep}
        <time dateTime={post.date}>{formatPostDate(post.date)}</time>
      </span>
      <span className="whitespace-nowrap">
        {sep}
        {post.readingMinutes} min read
      </span>
    </p>
  );
}
