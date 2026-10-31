import type { Metadata } from "next";
import { site } from "./site";

/** OpenGraph fields every page shares. */
export const baseOpenGraph = { siteName: site.name, locale: "en_IN", type: "website" } as const;

/**
 * The card from src/app/opengraph-image.tsx. A page that sets `openGraph` loses that file's image, and an image
 * set here outranks a page's own `opengraph-image` file, so every page names its card explicitly.
 */
export const shareImage = { url: "/opengraph-image", width: 1200, height: 630, type: "image/png", alt: "FiixBE - See every degree of your recovery." };

type PageSeo = {
  /** Leave out on the homepage to use the layout's default title. */
  title?: string;
  description?: string;
  /** The page's path, such as "/pricing". Becomes the canonical URL and og:url. */
  path: string;
  openGraph?: Metadata["openGraph"];
  /** A page's own share card. Defaults to the site card. */
  image?: { url: string; alt: string };
};

/**
 * Next merges metadata shallowly, so a page that sets `openGraph` drops the layout's fields.
 * Every page builds its metadata here to keep the shared fields, its canonical URL and og:url.
 */
export function pageMetadata({ title, description, path, openGraph, image }: PageSeo): Metadata {
  const card = image ? { ...shareImage, ...image } : shareImage;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...baseOpenGraph, url: path, images: [card], ...openGraph },
    twitter: { card: "summary_large_image", images: [card] },
  };
}

/** Absolute URL on the canonical host. */
export function absoluteUrl(path: string) {
  return new URL(path, site.url).toString();
}

export const organization = {
  "@type": "Organization",
  "@id": absoluteUrl("/#organization"),
  name: site.name,
  url: absoluteUrl("/"),
  logo: absoluteUrl("/apple-icon.png"),
  email: site.email,
  description: "Physiotherapy plans from licensed physiotherapists, with an AI that checks every rep you do at home.",
} as const;

/** Renders schema.org structured data. Escapes "<" so post text cannot close the script tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c") }}
    />
  );
}
