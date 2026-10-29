import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NewsletterForm } from "@/components/blog/NewsletterForm";
import { PostMetaLine } from "@/components/blog/PostMetaLine";
import { Container } from "@/components/ui/Container";
import { getAllPosts, type PostMeta } from "@/lib/blog";

const description =
  "Researched guides on physiotherapy and recovery at home, from the FiixBE Clinical Team. Every article lists its sources.";

export const metadata: Metadata = {
  title: "Blog",
  description,
  alternates: { canonical: "/blog" },
  openGraph: { title: "FiixBE blog", description, url: "/blog" },
};

export default async function BlogPage() {
  const posts = await getAllPosts();
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p !== featured);

  return (
    <div className="pb-24 pt-12 md:pt-20">
      <Container>
        <header className="max-w-[720px]">
          <h1 className="font-serif text-[40px] font-normal leading-[1.04] tracking-[-0.02em] md:text-[60px]">
            Recovery, explained
          </h1>
          <p className="mt-5 max-w-[600px] text-pretty text-[18px] leading-relaxed text-muted md:text-[19px]">{description}</p>
        </header>

        <FeaturedPost post={featured} />

        <ul className="mt-6 border-t border-line md:mt-10">
          {rest.map((post) => (
            <li key={post.slug} className="border-b border-line">
              <PostRow post={post} />
            </li>
          ))}
        </ul>

        <section aria-labelledby="newsletter" className="mt-16 grid gap-8 rounded-[14px] border border-line bg-surface p-6 md:mt-20 md:grid-cols-2 md:gap-16 md:p-12">
          <div>
            <h2 id="newsletter" className="font-serif text-[30px] font-normal leading-[1.1] tracking-[-0.015em] md:text-[38px]">
              New articles by email
            </h2>
            <p className="mt-4 max-w-[440px] text-[17px] leading-relaxed text-muted">
              One short email when we publish something new. Nothing else.
            </p>
          </div>
          <div className="md:pt-2">
            <NewsletterForm />
          </div>
        </section>
      </Container>
    </div>
  );
}

function FeaturedPost({ post }: { post: PostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      prefetch
      className="group mt-12 grid items-center gap-7 md:mt-16 md:grid-cols-[1.2fr_1fr] md:gap-12 lg:gap-16"
    >
      <div className="relative aspect-[3/2] overflow-hidden rounded-[14px] bg-surface-2">
        <Image
          src={post.image.src}
          alt={post.image.alt}
          fill
          preload
          sizes="(min-width: 1200px) 640px, (min-width: 768px) 55vw, calc(100vw - 48px)"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.015]"
        />
      </div>
      <div>
        <PostMetaLine post={post} />
        <h2 className="mt-4 text-balance font-serif text-[30px] font-normal leading-[1.08] tracking-[-0.02em] decoration-line decoration-1 underline-offset-[6px] group-hover:underline md:text-[38px]">
          {post.title}
        </h2>
        <p className="mt-4 text-pretty text-[17px] leading-relaxed text-muted">{post.description}</p>
        <span className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-accent">
          Read the article
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M6 3.5 10.5 8 6 12.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

function PostRow({ post }: { post: PostMeta }) {
  // Small screens: meta spans the row, then title beside a square thumbnail.
  // From md: image on the left, text column on the right.
  return (
    <Link
      href={`/blog/${post.slug}`}
      prefetch
      className="group grid grid-cols-[1fr_76px] items-start gap-x-4 py-7 sm:grid-cols-[1fr_160px] sm:gap-x-6 md:grid-cols-[220px_minmax(0,640px)] md:grid-rows-[auto_auto_auto_1fr] md:gap-x-10 md:py-9"
    >
      <PostMetaLine post={post} className="col-span-2 md:col-span-1 md:col-start-2 md:row-start-1" />
      <h3 className="col-start-1 row-start-2 mt-2.5 text-pretty font-serif text-[21px] md:text-balance font-normal leading-[1.15] tracking-[-0.015em] decoration-line decoration-1 underline-offset-[5px] group-hover:underline sm:text-[22px] md:col-start-2 md:text-[28px]">
        {post.title}
      </h3>
      <p className="col-start-1 row-start-3 mt-3 hidden text-pretty text-[16px] leading-relaxed text-muted sm:block md:col-start-2">
        {post.description}
      </p>
      <div className="relative col-start-2 row-start-2 row-span-2 mt-3 aspect-square overflow-hidden rounded-[10px] bg-surface-2 sm:aspect-[3/2] md:col-start-1 md:row-start-1 md:row-span-4 md:mt-0">
        <Image src={post.image.src} alt="" fill sizes="(min-width: 768px) 220px, 160px" className="object-cover" />
      </div>
    </Link>
  );
}
