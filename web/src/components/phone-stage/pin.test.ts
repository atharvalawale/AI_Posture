// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PIN_QUERIES } from "./pin";

describe("PIN_QUERIES", () => {
  it("matches the pin variant in globals.css, so CSS and the scroll story agree on when the stage pins", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    const variant = css.match(/@custom-variant pin \{\s*@media ([^{]+)\{/);
    expect(variant).not.toBeNull();
    const queries = variant![1].split(",").map((q) => q.replace(/\s+/g, " ").trim());
    expect(queries).toEqual([...PIN_QUERIES]);
  });
});
