import Image from "next/image";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

// Shared building blocks for the marketing pages (for patients, for physios, pricing, about).
// One type scale and one rhythm, so the four pages read as one publication.

export const h1Class =
  "font-serif text-[42px] leading-[1.04] tracking-[-0.02em] text-balance sm:text-[52px] lg:text-[64px]";
export const h2Class = "font-serif text-[32px] leading-[1.1] tracking-[-0.015em] text-balance md:text-[42px]";
export const h3Class = "text-[17px] font-semibold leading-snug";
export const leadClass = "text-lg leading-relaxed text-muted text-pretty md:text-xl md:leading-relaxed";
export const bodyClass = "text-[16px] leading-relaxed text-muted text-pretty";

/** A page section. Every section after the first sits under a thin rule. */
export function Section({
  children,
  id,
  className,
  labelledBy,
  rule = true,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  labelledBy?: string;
  rule?: boolean;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`scroll-mt-(--header-h) ${rule ? "border-t border-line" : ""}`}>
      <Container className={`py-20 md:py-28 ${className ?? ""}`}>{children}</Container>
    </section>
  );
}

export function SectionHeading({
  id,
  title,
  intro,
  className,
}: {
  id: string;
  title: ReactNode;
  intro?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`max-w-2xl ${className ?? ""}`}>
      <h2 id={id} className={h2Class}>
        {title}
      </h2>
      {intro ? <p className={`mt-5 ${leadClass}`}>{intro}</p> : null}
    </div>
  );
}

export type Item = { title: string; body: ReactNode };

/** Plain list of title + description, separated by thin rules. Replaces icon-card grids. */
export function RuleList({ items, className }: { items: readonly Item[]; className?: string }) {
  return (
    <ul className={`border-t border-line ${className ?? ""}`}>
      {items.map((item) => (
        <li key={item.title} className="border-b border-line py-5">
          <h3 className={h3Class}>{item.title}</h3>
          <p className={`mt-1.5 ${bodyClass}`}>{item.body}</p>
        </li>
      ))}
    </ul>
  );
}

/** Items laid out in columns, each under a thin top rule. */
export function RuleColumns({
  items,
  cols = 3,
  numbered = false,
}: {
  items: readonly Item[];
  cols?: 3 | 4;
  numbered?: boolean;
}) {
  const grid = cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3";
  const List = numbered ? "ol" : "ul";
  return (
    <List className={`grid gap-x-8 gap-y-10 ${grid}`}>
      {items.map((item, i) => (
        <li key={item.title} className="border-t border-line pt-6">
          {numbered ? (
            <span aria-hidden="true" className="mb-5 block font-serif text-[40px] leading-none text-accent">
              {i + 1}
            </span>
          ) : null}
          <h3 className={h3Class}>{item.title}</h3>
          <p className={`mt-2 ${bodyClass}`}>{item.body}</p>
        </li>
      ))}
    </List>
  );
}

/** Self-hosted photo with rounded corners, cropped by its frame. */
export function Photo({
  src,
  alt,
  className,
  sizes,
  position = "center",
  preload = false,
}: {
  src: string;
  alt: string;
  className: string;
  sizes: string;
  position?: string;
  preload?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-surface-2 ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} preload={preload} className="object-cover" style={{ objectPosition: position }} />
    </div>
  );
}

/** Closing call to action: centered serif line, one short sentence, buttons, optional quiet note. */
export function ClosingCta({
  id,
  title,
  body,
  actions,
  note,
}: {
  id: string;
  title: ReactNode;
  body: ReactNode;
  actions: ReactNode;
  note?: ReactNode;
}) {
  return (
    <Section labelledBy={id} className="text-center">
      <h2 id={id} className={`mx-auto max-w-3xl ${h2Class} md:text-[52px]`}>
        {title}
      </h2>
      <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-balance text-muted md:text-xl md:leading-relaxed">{body}</p>
      <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">{actions}</div>
      {note ? <p className="mt-6 text-sm text-muted">{note}</p> : null}
    </Section>
  );
}
