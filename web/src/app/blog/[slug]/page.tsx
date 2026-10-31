import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/blog/ArticleBody";
import { PostAuthor } from "@/components/blog/PostAuthor";
import { PostMetaLine } from "@/components/blog/PostMetaLine";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { getAllPosts, getPost, type PostMeta } from "@/lib/blog";
import { absoluteUrl, JsonLd, organization, pageMetadata } from "@/lib/seo";

// Typed by hand: generated route types live in each dev server's own dist folder here.
type Props = { params: Promise<{ slug: string }> };

// Every post is prerendered from generateStaticParams. The page awaits `params` before streaming
// so an unknown slug returns a real 404 status. Moving that into <Suspense> would make client
// navigations "instant" but turn the 404 into a 200 with a noindex tag, so we opt out here.
export const instant = false;

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  const { meta } = post;
  return pageMetadata({
    title: meta.title,
    description: meta.description,
    path: `/blog/${meta.slug}`,
    openGraph: { type: "article", title: meta.title, publishedTime: meta.date, section: meta.category, authors: [meta.author] },
    // The card from opengraph-image.tsx. The post photos are too large for WhatsApp previews.
    image: { url: `/blog/${meta.slug}/opengraph-image`, alt: meta.title },
  });
}

function structuredData(meta: PostMeta) {
  const url = absoluteUrl(`/blog/${meta.slug}`);
  return {
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        mainEntityOfPage: url,
        headline: meta.title,
        description: meta.description,
        image: [absoluteUrl(meta.image.src)],
        datePublished: meta.date,
        articleSection: meta.category,
        inLanguage: "en-IN",
        author: { "@type": "Organization", name: meta.author, url: absoluteUrl("/about") },
        publisher: organization,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl("/blog") },
          { "@type": "ListItem", position: 3, name: meta.title, item: url },
        ],
      },
    ],
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const { meta, html } = post;

  return (
    <article className="pb-24 pt-10 md:pt-16">
      <JsonLd data={structuredData(meta)} />
      <Container>
        <div className="mx-auto max-w-[760px]">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-text">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M10 3.5 5.5 8l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All articles
          </Link>
          <PostMetaLine post={meta} className="mt-10" />
          <h1 className="mt-4 text-balance font-serif text-[36px] font-normal leading-[1.08] tracking-[-0.02em] md:text-[52px] md:leading-[1.04]">
            {meta.title}
          </h1>
          <p className="mt-5 text-pretty text-[19px] leading-relaxed text-muted md:text-[21px]">{meta.description}</p>
          <div className="mt-8">
            <PostAuthor reviewedBy={meta.reviewedBy} />
          </div>
        </div>

        <figure className="mx-auto mt-10 max-w-[1040px] md:mt-14">
          <div className="relative aspect-[3/2] overflow-hidden rounded-[14px] bg-surface-2 md:aspect-[16/9]">
            <Image
              src={meta.image.src}
              alt={meta.image.alt}
              fill
              preload
              sizes="(min-width: 1120px) 1040px, calc(100vw - 48px)"
              className="object-cover"
            />
          </div>
          <figcaption className="mt-3 text-[13px] text-muted">
            Photo by{" "}
            <a href={meta.image.page} className="underline decoration-line underline-offset-2 hover:text-text" rel="noopener">
              {meta.image.photographer}
            </a>{" "}
            on Unsplash
          </figcaption>
        </figure>

        <div className="mx-auto mt-12 max-w-[680px] md:mt-16">
          <ArticleBody html={html} />

          <p className="mt-14 border-t border-line pt-6 text-[15px] leading-relaxed text-muted">
            This article is general information, not medical advice. Talk to your physiotherapist or doctor before starting new exercises.
          </p>

          <section aria-labelledby="sources" className="mt-12">
            <h2 id="sources" className="text-[19px] font-semibold tracking-[-0.005em]">
              Sources
            </h2>
            <ol className="mt-5 list-decimal space-y-3 pl-6 text-[15px] leading-relaxed text-muted marker:text-muted">
              {meta.sources.map((source) => (
                <li key={source.url} className="pl-1.5">
                  <a
                    href={source.url}
                    rel="noopener"
                    className="break-words text-text underline decoration-line underline-offset-[3px] transition-colors hover:decoration-accent"
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ol>
          </section>

          <aside className="mt-16 rounded-[14px] border border-line bg-surface p-6 md:p-8">
            <p className="font-serif text-[24px] leading-tight tracking-[-0.015em] md:text-[28px]">Exercise with your physio&rsquo;s plan, at home.</p>
            <p className="mt-3 text-[16px] leading-relaxed text-muted">
              FiixBE counts your reps and checks your form through your camera, then shares each session with your physiotherapist.
            </p>
            <Button href="/session" className="mt-6">
              Try it on the web
            </Button>
          </aside>
        </div>
      </Container>
    </article>
  );
}
