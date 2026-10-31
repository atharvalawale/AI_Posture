// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./blog";
import { describeChart, formatValue, parseChartSpec, renderChart } from "./charts";

const SOURCE = "https://example.org/study";

const spec = {
  title: "Return to sport",
  unit: "%",
  max: 100,
  bars: [
    { label: "Any sport", value: 81 },
    { label: "Competitive sport", value: 55 },
  ],
  note: "Average across 69 studies.",
  sources: [{ name: "Ardern 2014", url: SOURCE }],
};

const json = (value: unknown) => JSON.stringify(value);
const block = (value: unknown) => "Intro paragraph.\n\n```chart\n" + json(value) + "\n```\n\nAfter.\n";

describe("parseChartSpec", () => {
  it("accepts a valid spec and fills defaults", () => {
    const parsed = parseChartSpec(json({ ...spec, unit: undefined, max: undefined }));
    expect(parsed.unit).toBe("");
    expect(parsed.bars).toHaveLength(2);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseChartSpec("{ title: nope }")).toThrow(/not valid JSON/);
  });

  it("rejects unknown keys, so typos do not pass silently", () => {
    expect(() => parseChartSpec(json({ ...spec, colour: "red" }))).toThrow(/Invalid chart/);
  });

  it("rejects a value above max", () => {
    expect(() => parseChartSpec(json({ ...spec, bars: [...spec.bars, { label: "Too much", value: 120 }] }))).toThrow(/above max 100/);
  });

  it("rejects decimals that would round a source number", () => {
    expect(() => parseChartSpec(json({ ...spec, decimals: 0, bars: [{ label: "A", value: 9.7 }, { label: "B", value: 62 }] }))).toThrow(
      /would be rounded/,
    );
  });

  it("rejects a single bar, labels too long for a phone, and em dashes", () => {
    expect(() => parseChartSpec(json({ ...spec, bars: [spec.bars[0]] }))).toThrow();
    expect(() => parseChartSpec(json({ ...spec, bars: [{ label: "x".repeat(33), value: 1 }, spec.bars[1]] }))).toThrow();
    expect(() => parseChartSpec(json({ ...spec, title: "Return \u2014 sport" }))).toThrow(/em dash/);
  });

  it("requires at least one source with a real URL", () => {
    expect(() => parseChartSpec(json({ ...spec, sources: [] }))).toThrow();
    expect(() => parseChartSpec(json({ ...spec, sources: [{ name: "x", url: "not a url" }] }))).toThrow();
  });
});

describe("formatValue and describeChart", () => {
  it("keeps numbers exactly as written, with fixed decimals when asked", () => {
    expect(formatValue({ unit: "%" }, 9.7)).toBe("9.7%");
    expect(formatValue({ unit: "%", decimals: 1 }, 2)).toBe("2.0%");
    expect(formatValue({ unit: "°" }, 157)).toBe("157°");
    expect(formatValue({ unit: "", decimals: 2 }, 0.36)).toBe("0.36");
  });

  it("states every value for screen readers", () => {
    expect(describeChart(parseChartSpec(json(spec)))).toBe("Return to sport. Any sport: 81 percent. Competitive sport: 55 percent.");
  });
});

describe("renderChart", () => {
  const html = renderChart(parseChartSpec(json(spec)));

  it("renders a figure with an accessible SVG and a caption that names the source", () => {
    expect(html).toMatch(/^<figure[^>]*>[\s\S]*<\/figure>$/);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Return to sport. Any sport: 81 percent. Competitive sport: 55 percent."');
    expect(html).toMatch(/<figcaption[^>]*>Average across 69 studies\. Source: <a href="https:\/\/example\.org\/study" rel="noopener">Ardern 2014<\/a>\.<\/figcaption>/);
  });

  it("sizes bars as a share of 80% of the width so value labels fit beside them", () => {
    // 81 of 100 is 64.8% of the width, 55 of 100 is 44%.
    expect(html).toContain('width="64.8%"');
    expect(html).toContain('width="44%"');
    expect(html).toContain('<text x="64.8%" dx="6"');
    expect(html).toContain(">81%</text>");
  });

  it("has no viewBox, so text renders at real pixel sizes of 13 px or more", () => {
    expect(html).not.toContain("viewBox");
    const sizes = [...html.matchAll(/text-\[(\d+)px\]/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(13);
  });

  it("uses theme token classes only, never fixed colours or gradients", () => {
    expect(html).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(|gradient/i);
    expect(html).toContain("fill-accent");
    expect(html).toContain("fill-text");
    expect(html).toContain("fill-muted");
  });

  it("draws a 0 to max axis only when max is set", () => {
    expect(html).toContain(">100%</text>");
    expect(html).toContain('height="128"');
    const noMax = renderChart(parseChartSpec(json({ ...spec, max: undefined })));
    expect(noMax).not.toContain(">100%</text>");
    // Without max, the longest bar fills the plot.
    expect(noMax).toContain('width="80%"');
    expect(noMax).toContain('height="94"');
  });

  it("escapes text", () => {
    const out = renderChart(parseChartSpec(json({ ...spec, title: 'Pain <b>&</b> "rest"' })));
    expect(out).toContain("Pain &lt;b&gt;&amp;&lt;/b&gt; &quot;rest&quot;");
    expect(out).not.toContain("<b>");
  });
});

describe("charts in Markdown", () => {
  const options = { file: "content/blog/test.md", sourceUrls: [SOURCE] };

  it("replaces a chart code block with the figure", async () => {
    const html = await renderMarkdown(block(spec), options);
    expect(html).toContain("<figure");
    expect(html).toContain("<svg");
    expect(html).not.toContain("language-chart");
    expect(html).toContain("<p>Intro paragraph.</p>");
    expect(html).toContain("<p>After.</p>");
  });

  it("leaves other code blocks alone and still drops raw HTML written in Markdown", async () => {
    const html = await renderMarkdown('```js\nconst a = 1;\n```\n\n<script>alert(1)</script>\n\n<b onclick="x">hi</b>\n', options);
    expect(html).toContain('<code class="language-js">');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
  });

  it("fails with the file name and chart number on a bad spec", async () => {
    await expect(renderMarkdown(block({ ...spec, bars: [] }), options)).rejects.toThrow(/content\/blog\/test\.md, chart 1: Invalid chart/);
  });

  it("fails when a chart cites a source the post does not list", async () => {
    await expect(renderMarkdown(block(spec), { ...options, sourceUrls: [] })).rejects.toThrow(/must also be listed in the post's sources/);
  });
});
