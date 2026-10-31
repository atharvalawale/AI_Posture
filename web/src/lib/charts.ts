import type { Element, Root, RootContent } from "hast";
import { z } from "zod";

/*
 * Charts for blog posts. A post writes a fenced code block with the language `chart` holding a
 * JSON spec. At build time rehypeCharts turns it into a <figure> with static markup and a caption
 * that names the source. No chart code reaches the browser.
 *
 * Each figure has a `type`, chosen by the job the numbers do:
 * - bars (the default): compare a few amounts, largest to smallest or in a natural order.
 * - stats: one to three headline numbers that stand alone. The number is the chart.
 * - meters: one or more shares of a whole, each a filled track out of 100%.
 * - ranges: spans from a low to a high value, such as prevalence across studies.
 * - timeline: phases of recovery on a shared time axis.
 *
 * The SVGs have no viewBox, so text renders at true CSS pixel sizes on every screen. Marks are
 * percentages of the SVG width, so they stretch with the column while the labels stay readable on
 * a 320 px phone. Colours come from the theme tokens through Tailwind classes, so light and dark
 * mode both work.
 */

const NO_EM_DASH = (s: string) => !s.includes("\u2014");
const text = (max: number) => z.string().trim().min(1).max(max).refine(NO_EM_DASH, "Use a plain hyphen, not an em dash");

const UNITS = {
  "%": { suffix: "%", spoken: " percent" },
  "°": { suffix: "°", spoken: " degrees" },
  "": { suffix: "", spoken: "" },
  days: { suffix: " days", spoken: " days" },
  weeks: { suffix: " weeks", spoken: " weeks" },
  months: { suffix: " months", spoken: " months" },
  years: { suffix: " years", spoken: " years" },
} as const;

type Unit = keyof typeof UNITS;
const amountUnit = z.enum(["%", "°", ""]);
const timeUnit = z.enum(["days", "weeks", "months", "years"]);
const anyUnit = z.enum(["%", "°", "", "days", "weeks", "months", "years"]);

const base = {
  title: text(90),
  /** Fixed decimals for every value, for example 1 so that 2.0 prints as "2.0". Never rounds. */
  decimals: z.number().int().min(0).max(3).optional(),
  /** One or two plain sentences about what the numbers are, printed before the source. */
  note: text(240).optional(),
  sources: z.array(z.strictObject({ name: text(160), url: z.url() })).min(1),
};

// Labels on a row with a value printed at its right end are kept short, so both fit a 272 px column.
const ROW_LABEL = 22;

const barsSchema = z.strictObject({
  ...base,
  type: z.literal("bars"),
  /** Printed right after each value. */
  unit: amountUnit.default(""),
  /** The value at the end of the scale. Set it to 100 for percentages of a whole, and an axis is drawn. */
  max: z.number().positive().optional(),
  // Labels sit on their own line above each bar. 32 characters fit a 272 px column at 14 px.
  bars: z.array(z.strictObject({ label: text(32), value: z.number().nonnegative() })).min(2).max(8),
});

const statsSchema = z.strictObject({
  ...base,
  type: z.literal("stats"),
  stats: z
    .array(
      z.strictObject({
        value: z.number(),
        unit: anyUnit.default(""),
        /** What the number is, in a short sentence. Qualifiers like "up to" belong here. */
        label: text(120),
      }),
    )
    .min(1)
    .max(3),
});

const metersSchema = z.strictObject({
  ...base,
  type: z.literal("meters"),
  meters: z.array(z.strictObject({ label: text(ROW_LABEL), value: z.number().min(0).max(100) })).min(1).max(5),
});

const rangesSchema = z.strictObject({
  ...base,
  type: z.literal("ranges"),
  unit: amountUnit.default(""),
  /** The end of the scale. Defaults to 100 for percentages, otherwise to the highest value. */
  max: z.number().positive().optional(),
  ranges: z
    .array(z.strictObject({ label: text(ROW_LABEL), low: z.number().nonnegative(), high: z.number().nonnegative() }))
    .min(1)
    .max(6),
});

const timelineSchema = z.strictObject({
  ...base,
  type: z.literal("timeline"),
  unit: timeUnit,
  /** The end of the time axis. Required when a phase is open-ended. */
  max: z.number().positive().optional(),
  phases: z
    .array(
      z.strictObject({
        label: text(ROW_LABEL),
        from: z.number().nonnegative(),
        /** Leave out for a phase with no fixed end, such as "from 9 months". */
        to: z.number().positive().optional(),
      }),
    )
    .min(2)
    .max(8),
});

/** Every number a spec prints, with where it sits, for the checks below. */
function values(spec: ChartSpec): { path: (string | number)[]; value: number }[] {
  switch (spec.type) {
    case "bars":
      return spec.bars.map((b, i) => ({ path: ["bars", i, "value"], value: b.value }));
    case "stats":
      return spec.stats.map((st, i) => ({ path: ["stats", i, "value"], value: st.value }));
    case "meters":
      return spec.meters.map((m, i) => ({ path: ["meters", i, "value"], value: m.value }));
    case "ranges":
      return spec.ranges.flatMap((r, i) => [
        { path: ["ranges", i, "low"], value: r.low },
        { path: ["ranges", i, "high"], value: r.high },
      ]);
    case "timeline":
      return spec.phases.flatMap((ph, i) => [
        { path: ["phases", i, "from"], value: ph.from },
        ...(ph.to === undefined ? [] : [{ path: ["phases", i, "to"], value: ph.to }]),
      ]);
  }
}

export const chartSpecSchema = z.preprocess(
  // Charts written before there were types are bar charts.
  (input) => (input && typeof input === "object" && !("type" in input) ? { ...input, type: "bars" } : input),
  z.discriminatedUnion("type", [barsSchema, statsSchema, metersSchema, rangesSchema, timelineSchema]).superRefine((spec, ctx) => {
    for (const { path, value } of values(spec)) {
      if (spec.decimals !== undefined && Number(value.toFixed(spec.decimals)) !== value) {
        ctx.addIssue({ code: "custom", path, message: `${value} would be rounded by decimals: ${spec.decimals}. Charts never round source numbers.` });
      }
    }
    const max = "max" in spec ? spec.max : undefined;
    if (max !== undefined) {
      for (const { path, value } of values(spec)) {
        if (value > max) ctx.addIssue({ code: "custom", path, message: `${value} is above max ${max}` });
      }
    }
    if (spec.type === "ranges") {
      for (const [i, r] of spec.ranges.entries()) {
        if (r.low > r.high) ctx.addIssue({ code: "custom", path: ["ranges", i], message: `low ${r.low} is above high ${r.high}` });
      }
    }
    if (spec.type === "timeline") {
      for (const [i, ph] of spec.phases.entries()) {
        if (ph.to !== undefined && ph.to <= ph.from) ctx.addIssue({ code: "custom", path: ["phases", i], message: `to ${ph.to} must be after from ${ph.from}` });
        if (ph.to === undefined && max === undefined) ctx.addIssue({ code: "custom", path: ["phases", i, "to"], message: "An open-ended phase needs max, the end of the time axis" });
      }
    }
  }),
);

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

// Layout, in CSS pixels. Each row is a label line, then the mark.
const PLOT = 0.8; // The longest bar fills 80% of the width. The rest holds its value label.
const LABEL_BASELINE = 14;
const BAR_TOP = 22;
const BAR_HEIGHT = 16;
const ROW_PITCH = 56;
const ROWS_BOTTOM_GAP = ROW_PITCH - BAR_TOP - BAR_HEIGHT;
const AXIS_BAND = 34;
const RADIUS = 4;
// Meters, ranges and timeline phases: a thin mark, fully rounded, under a label line.
const SPAN_HEIGHT = 10;
const SPAN_PITCH = 50;
const SPAN_BOTTOM_GAP = SPAN_PITCH - BAR_TOP - SPAN_HEIGHT;

/** A number for an SVG percentage attribute, without float noise. */
const pct = (fraction: number) => `${Number((fraction * 100).toFixed(3))}%`;

function number(spec: Pick<ChartSpec, "decimals">, value: number) {
  return spec.decimals === undefined ? String(value) : value.toFixed(spec.decimals);
}

/** "1 week", not "1 weeks". */
function suffix(unit: Unit, value: number, spoken = false) {
  const s = spoken ? UNITS[unit].spoken : UNITS[unit].suffix;
  return value === 1 && s.endsWith("s") && unit !== "%" ? s.slice(0, -1) : s;
}

export function formatValue(spec: Pick<ChartSpec, "decimals"> & { unit?: Unit }, value: number) {
  return number(spec, value) + suffix(spec.unit ?? "", value);
}

/** "20.3% to 76.9%", "0 to 2 weeks", "From 9 months". */
function formatSpan(spec: Pick<ChartSpec, "decimals">, unit: Unit, from: number, to: number | undefined) {
  if (to === undefined) return `From ${formatValue({ ...spec, unit }, from)}`;
  // Time spans name the unit once; amounts carry it on both ends.
  if (unit in { days: 1, weeks: 1, months: 1, years: 1 }) return `${number(spec, from)} to ${formatValue({ ...spec, unit }, to)}`;
  return `${formatValue({ ...spec, unit }, from)} to ${formatValue({ ...spec, unit }, to)}`;
}

/** The sentence a screen reader hears in place of the picture: the title, then every value. */
export function describeChart(spec: ChartSpec) {
  const say = (value: number, unit: Unit) => number(spec, value) + suffix(unit, value, true);
  let parts: string[];
  switch (spec.type) {
    case "bars":
      parts = spec.bars.map((b) => `${b.label}: ${say(b.value, spec.unit)}`);
      break;
    case "stats":
      parts = spec.stats.map((st) => `${say(st.value, st.unit)}: ${st.label}`);
      break;
    case "meters":
      parts = spec.meters.map((m) => `${m.label}: ${say(m.value, "%")}`);
      break;
    case "ranges":
      parts = spec.ranges.map((r) => `${r.label}: ${say(r.low, spec.unit)} to ${say(r.high, spec.unit)}`);
      break;
    case "timeline":
      parts = spec.phases.map((ph) => `${ph.label}: ${ph.to === undefined ? `from ${say(ph.from, spec.unit)}` : `${number(spec, ph.from)} to ${say(ph.to, spec.unit)}`}`);
      break;
  }
  return `${spec.title}. ${parts.join(". ")}.`;
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** A hairline axis with ticks at 0, the middle (when it is a whole number) and the end. */
function axis(y: number, domain: number, x: (v: number) => string, label: (v: number) => string) {
  const lineY = y + 10.5; // Half pixel keeps the 1 px hairline crisp.
  const marks = Number.isInteger(domain / 2) ? [0, domain / 2, domain] : [0, domain];
  const ticks = marks.map((v, i) => {
    const anchor = i === 0 ? "start" : i === marks.length - 1 && x(v) === "100%" ? "end" : "middle";
    return (
      `<line x1="${x(v)}" x2="${x(v)}" y1="${lineY - 4}" y2="${lineY + 4}" class="stroke-muted" stroke-width="1"/>` +
      `<text x="${x(v)}" y="${lineY + 20}" text-anchor="${anchor}" class="fill-muted text-[13px]">${escape(label(v))}</text>`
    );
  });
  return `<g aria-hidden="true"><line x1="0" x2="${x(domain)}" y1="${lineY}" y2="${lineY}" class="stroke-line" stroke-width="1"/>${ticks.join("")}</g>`;
}

function renderBars(spec: Extract<ChartSpec, { type: "bars" }>) {
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

  const axisMarks = spec.max === undefined ? "" : axis(rowsHeight, spec.max, x, (v) => formatValue({ unit: spec.unit }, v));
  return svg(spec, height, rows.join("") + axisMarks);
}

type Span = { label: string; from: number; to: number; value: string; track?: boolean };

/**
 * Rows of thin marks: the label on the left of its line, the value on the right, and under them a
 * mark from `from` to `to` across the full width. Meters draw a faint track behind the mark.
 */
function renderSpans(spec: ChartSpec, rows: Span[], domain: number, axisLabel?: (v: number) => string) {
  const x = (v: number) => pct(v / domain);
  const rowsHeight = rows.length * SPAN_PITCH - SPAN_BOTTOM_GAP;
  const height = rowsHeight + (axisLabel ? AXIS_BAND : 0);
  const marks = rows.map((row, i) => {
    const top = i * SPAN_PITCH;
    const y = top + BAR_TOP;
    const track = row.track ? `<rect x="0" y="${y}" width="100%" height="${SPAN_HEIGHT}" rx="${SPAN_HEIGHT / 2}" class="fill-accent/15"/>` : "";
    // A zero-length span still shows as a dot, so a single value reads as a point on the scale.
    const width = row.to > row.from ? x(row.to - row.from) : `${SPAN_HEIGHT}`;
    const mark = row.to > row.from || !row.track ? `<rect x="${x(row.from)}" y="${y}" width="${width}" height="${SPAN_HEIGHT}" rx="${SPAN_HEIGHT / 2}" class="fill-accent"/>` : "";
    return (
      `<text x="0" y="${top + LABEL_BASELINE}" class="fill-muted text-[14px]">${escape(row.label)}</text>` +
      `<text x="100%" y="${top + LABEL_BASELINE}" text-anchor="end" class="fill-text text-[14px] font-semibold">${escape(row.value)}</text>` +
      track +
      mark
    );
  });
  return svg(spec, height, marks.join("") + (axisLabel ? axis(rowsHeight, domain, x, axisLabel) : ""));
}

function svg(spec: ChartSpec, height: number, content: string) {
  return `<svg width="100%" height="${height}" role="img" aria-label="${escape(describeChart(spec))}" class="mt-5 block overflow-visible">${content}</svg>`;
}

// Whole class names, so Tailwind finds them in this file.
const STAT_COLUMNS = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" } as const;

function renderStats(spec: Extract<ChartSpec, { type: "stats" }>) {
  const tiles = spec.stats.map(
    (st) =>
      `<div class="border-t border-line pt-4">` +
      `<p class="text-[40px] font-semibold leading-none tracking-[-0.02em] text-text tabular-nums">${escape(formatValue({ ...spec, unit: st.unit }, st.value))}</p>` +
      `<p class="mt-2.5 text-[15px] leading-snug text-muted">${escape(st.label)}</p>` +
      `</div>`,
  );
  return `<div class="mt-5 grid gap-x-8 gap-y-6 ${STAT_COLUMNS[spec.stats.length as 1 | 2 | 3]}">${tiles.join("")}</div>`;
}

function renderBody(spec: ChartSpec) {
  switch (spec.type) {
    case "bars":
      return renderBars(spec);
    case "stats":
      return renderStats(spec);
    case "meters":
      return renderSpans(
        spec,
        spec.meters.map((m) => ({ label: m.label, from: 0, to: m.value, value: formatValue({ ...spec, unit: "%" }, m.value), track: true })),
        100,
      );
    case "ranges": {
      const domain = spec.max ?? (spec.unit === "%" ? 100 : Math.max(...spec.ranges.map((r) => r.high)));
      const rows = spec.ranges.map((r) => ({ label: r.label, from: r.low, to: r.high, value: formatSpan(spec, spec.unit, r.low, r.high) }));
      return renderSpans(spec, rows, domain, (v) => formatValue({ unit: spec.unit }, v));
    }
    case "timeline": {
      const domain = spec.max ?? Math.max(...spec.phases.map((ph) => ph.to ?? ph.from));
      const rows = spec.phases.map((ph) => ({ label: ph.label, from: ph.from, to: ph.to ?? domain, value: formatSpan(spec, spec.unit, ph.from, ph.to) }));
      return renderSpans(spec, rows, domain, (v) => formatValue({ unit: spec.unit }, v));
    }
  }
}

/** The whole figure as an HTML string. */
export function renderChart(spec: ChartSpec): string {
  const sources = spec.sources.map((s) => `<a href="${escape(s.url)}" rel="noopener">${escape(s.name)}</a>`).join("; ");
  const caption = `${spec.note ? `${escape(spec.note)} ` : ""}${spec.sources.length > 1 ? "Sources" : "Source"}: ${sources}.`;

  return (
    `<figure class="chart my-10">` +
    `<div class="text-[16px] font-semibold leading-snug">${escape(spec.title)}</div>` +
    renderBody(spec) +
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
