// Long-form typography for rendered Markdown. Kept local so the blog does not need the typography plugin.
const prose = [
  "text-[17px] leading-[1.7] text-text md:text-[18px] md:leading-[1.65]",
  // Rhythm
  "[&>*:first-child]:mt-0 [&_p]:mt-5",
  // Headings
  "[&_h2]:mt-14 [&_h2]:scroll-mt-24 [&_h2]:font-serif [&_h2]:text-[27px] [&_h2]:font-normal [&_h2]:leading-[1.15] [&_h2]:tracking-[-0.015em] md:[&_h2]:text-[31px]",
  "[&_h3]:mt-10 [&_h3]:scroll-mt-24 [&_h3]:text-[19px] [&_h3]:font-semibold [&_h3]:leading-snug [&_h3]:tracking-[-0.005em]",
  "[&_h2+p]:mt-4 [&_h3+p]:mt-2 [&_h2+h3]:mt-6",
  // Lists
  "[&_ul]:mt-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-5 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_li]:mt-2 [&_li]:pl-1.5 [&_li::marker]:text-muted [&_li>p]:mt-2 [&_li>ul]:mt-2 [&_li>ol]:mt-2",
  // Inline
  "[&_strong]:font-semibold [&_em]:italic",
  "[&_a]:text-text [&_a]:underline [&_a]:decoration-accent [&_a]:decoration-1 [&_a]:underline-offset-[3px] [&_a:hover]:decoration-2",
  "[&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em]",
  // Blocks
  "[&_blockquote]:mt-6 [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-5 [&_blockquote]:text-muted",
  "[&_hr]:my-12 [&_hr]:border-line",
  // Tables scroll sideways on small screens instead of squashing.
  "[&_table]:mt-6 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-[15px] [&_table]:leading-normal",
  "[&_th]:border-b [&_th]:border-line [&_th]:py-3 [&_th]:pr-6 [&_th]:text-left [&_th]:align-bottom [&_th]:font-semibold",
  "[&_td]:border-b [&_td]:border-line [&_td]:py-3 [&_td]:pr-6 [&_td]:align-top",
].join(" ");

export function ArticleBody({ html }: { html: string }) {
  // The HTML comes from our own Markdown files in content/blog, rendered at build time.
  return <div className={prose} dangerouslySetInnerHTML={{ __html: html }} />;
}
