import type { Element, Root, RootContent } from "hast";
import { z } from "zod";

/*
 * Charts for blog posts. A post writes a fenced code block with the language `chart` holding a
 * JSON spec. At build time rehypeCharts turns it into a <figure> with a static inline SVG and a
 * caption that names the source. No chart code reaches the browser.
 *
 * The SVG has no viewBox, so its text renders at true CSS pixel sizes on every screen. Bar lengths
 * and value positions are percentages of the SVG width, so the bars stretch with the column while
 * the labels stay readable on a 320 px phone. Colours come from the theme tokens through Tailwind
 * classes, so light and dark mode both work.
 */

const NO_EM_DASH = (s: string) => !s.includes("\u2014");
const text = (max: number) => z.string().trim().min(1).max(max).refine(NO_EM_DASH, "Use a plain hyphen, not an em dash");

const UNITS = {
  "%": { suffix: "%", spoken: " percent" },
  "°": { suffix: "°", spoken: " degrees" },
  "": { suffix: "", spoken: "" },
} as const;

export const chartSpecSchema = z
  .strictObject({
    title: text(90),
    /** Printed right after each value. */
    unit: z.enum(["%", "°", ""]).default(""),
    /** Fixed decimals for every value, for example 1 so that 2.0 prints as "2.0". */
    decimals: z.number().int().min(0).max(3).optional(),
    /** The value at the end of the scale. Set it to 100 for percentages of a whole, and an axis is drawn. */
    max: z.number().positive().optional(),
    // Labels sit on their own line above each bar. 32 characters fit a 272 px column at 14 px.
    bars: z.array(z.strictObject({ label: text(32), value: z.number().nonnegative() })).min(2).max(8),
    /** One or two plain sentences about what the numbers are, printed before the source. */
    note: text(240).optional(),
    sources: z.array(z.strictObject({ name: text(160), url: z.url() })).min(1),
  })
  .superRefine((spec, ctx) => {
    for (const [i, bar] of spec.bars.entries()) {
      if (spec.max !== undefined && bar.value > spec.max) {
        ctx.addIssue({ code: "custom", path: ["bars", i, "value"], message: `${bar.value} is above max ${spec.max}` });
      }
      if (spec.decimals !== undefined && Number(bar.value.toFixed(spec.decimals)) !== bar.value) {
        ctx.addIssue({
          code: "custom",
          path: ["bars", i, "value"],
          message: `${bar.value} would be rounded by decimals: ${spec.decimals}. Charts never round source numbers.`,
        });
      }
    }
  });

export type ChartSpec = z.infer<typeof chartSpecSchema>;

/** Parses the text of a `chart` code block. Throws a readable error on bad JSON or a bad spec. */
export function parseChartSpec(source: string): ChartSpec {
  let json: unknown;
  try {
    json = JSON.parse(source);
  } catch (error) {
    throw new Error(`Chart is not valid JSON: ${(error as Error).message}`);
  }
  const result = chartSpecSchema.safeParse(json);
  if (!result.success) throw new Error(`Invalid chart:\n${z.prettifyError(result.error)}`);
  return result.data;
}

// Layout, in CSS pixels. Each row is a label line, then the bar.
const PLOT = 0.8; // The longest bar fills 80% of the width. The rest holds its value label.
const LABEL_BASELINE = 14;
const BAR_TOP = 22;
const BAR_HEIGHT = 16;
const ROW_PITCH = 56;
const ROWS_BOTTOM_GAP = ROW_PITCH - BAR_TOP - BAR_HEIGHT;
const AXIS_BAND = 34;
const RADIUS = 4;

/** A number for an SVG percentage attribute, without float noise. */
const pct = (fraction: number) => `${Number((fraction * 100).toFixed(3))}%`;

export function formatValue(spec: Pick<ChartSpec, "decimals" | "unit">, value: number) {
  const n = spec.decimals === undefined ? String(value) : value.toFixed(spec.decimals);
  return n + UNITS[spec.unit].suffix;
}

/** The sentence a screen reader hears in place of the picture: the title, then every value. */
export function describeChart(spec: ChartSpec) {
  const unit = UNITS[spec.unit].spoken;
  const n = (v: number) => (spec.decimals === undefined ? String(v) : v.toFixed(spec.decimals));
  return `${spec.title}. ${spec.bars.map((b) => `${b.label}: ${n(b.value)}${unit}`).join(". ")}.`;
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The whole figure as an HTML string. */
export function renderChart(spec: ChartSpec): string {
  const domain = spec.max ?? Math.max(...spec.bars.map((b) => b.value));
  const x = (v: number) => pct((v / domain) * PLOT);
  const rowsHeight = spec.bars.length * ROW_PITCH - ROWS_BOTTOM_GAP;
  const height = rowsHeight + (spec.max === undefined ? 0 : AXIS_BAND);

  const rows = spec.bars.map((bar, i) => {
    const top = i * ROW_PITCH;
    const barY = top + BAR_TOP;
    // The nested <svg> clips its content to the bar's length. Inside it a rounded rect gives the
    // 4 px rounded data end, and a short square rect covers the rounding at the baseline.
    const mark =
      bar.value > 0
        ? `<svg x="0" y="${barY}" width="${x(bar.value)}" height="${BAR_HEIGHT}" class="fill-accent">` +
          `<rect width="100%" height="${BAR_HEIGHT}" rx="${RADIUS}"/><rect width="${RADIUS}" height="${BAR_HEIGHT}"/></svg>`
        : "";
    return (
      `<text x="0" y="${top + LABEL_BASELINE}" class="fill-muted text-[14px]">${escape(bar.label)}</text>` +
      mark +
      `<text x="${x(bar.value)}" dx="${bar.value > 0 ? 6 : 0}" y="${barY + BAR_HEIGHT / 2}" dominant-baseline="central" class="fill-text text-[14px] font-semibold">${escape(formatValue(spec, bar.value))}</text>`
    );
  });

  let axis = "";
  if (spec.max !== undefined) {
    const lineY = rowsHeight + 10.5; // Half pixel keeps the 1 px hairline crisp.
    const ticks = [0, spec.max / 2, spec.max].map((v, i) => {
      const anchor = i === 0 ? "start" : "middle";
      return (
        `<line x1="${x(v)}" x2="${x(v)}" y1="${lineY - 4}" y2="${lineY + 4}" class="stroke-muted" stroke-width="1"/>` +
        `<text x="${x(v)}" y="${lineY + 20}" text-anchor="${anchor}" class="fill-muted text-[13px]">${escape(formatValue({ unit: spec.unit }, v))}</text>`
      );
    });
    axis = `<g aria-hidden="true"><line x1="0" x2="${x(spec.max)}" y1="${lineY}" y2="${lineY}" class="stroke-line" stroke-width="1"/>${ticks.join("")}</g>`;
  }

  const sources = spec.sources.map((s) => `<a href="${escape(s.url)}" rel="noopener">${escape(s.name)}</a>`).join("; ");
  const caption = `${spec.note ? `${escape(spec.note)} ` : ""}${spec.sources.length > 1 ? "Sources" : "Source"}: ${sources}.`;

  return (
    `<figure class="chart my-10">` +
    `<div class="text-[16px] font-semibold leading-snug">${escape(spec.title)}</div>` +
    `<svg width="100%" height="${height}" role="img" aria-label="${escape(describeChart(spec))}" class="mt-5 block">${rows.join("")}${axis}</svg>` +
    `<figcaption class="mt-4 text-[14px] leading-normal text-muted">${caption}</figcaption>` +
    `</figure>`
  );
}

type RehypeChartsOptions = {
  /** Shown in errors, for example "content/blog/acl-recovery-timeline.md". */
  file: string;
  /** Every chart source must be one of the post's own sources. */
  sourceUrls: string[];
};

function isChartBlock(node: RootContent): boolean {
  if (node.type !== "element" || node.tagName !== "pre") return false;
  const code = node.children.find((c): c is Element => c.type === "element");
  const classes = code?.tagName === "code" ? code.properties.className : undefined;
  return Array.isArray(classes) && classes.includes("language-chart");
}

function textContent(node: Element | RootContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textContent).join("");
  return "";
}

/** Rehype plugin: replaces every ```chart code block with the rendered figure. */
export function rehypeCharts({ file, sourceUrls }: RehypeChartsOptions) {
  return (tree: Root) => {
    let count = 0;
    const walk = (parent: Root | Element) => {
      parent.children = parent.children.map((node) => {
        if (!isChartBlock(node)) {
          if (node.type === "element") walk(node);
          return node;
        }
        count += 1;
        try {
          const spec = parseChartSpec(textContent(node));
          const unknown = spec.sources.filter((s) => !sourceUrls.includes(s.url));
          if (unknown.length > 0) {
            throw new Error(`Chart sources must also be listed in the post's sources: ${unknown.map((s) => s.url).join(", ")}`);
          }
          // The figure is built from escaped strings above, so it is passed through as raw HTML.
          return { type: "raw", value: renderChart(spec) } as unknown as Element;
        } catch (error) {
          throw new Error(`${file}, chart ${count}: ${(error as Error).message}`);
        }
      });
    };
    walk(tree);
  };
}
