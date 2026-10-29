import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./blog-manifest.json";

describe("blog manifest", () => {
  it("lists exactly the posts in content/blog (run `npm run blog:manifest` after adding a post)", () => {
    const onDisk = readdirSync(join(process.cwd(), "content/blog"))
      .filter((file) => file.endsWith(".md") && !file.startsWith("."))
      .map((file) => file.slice(0, -3))
      .sort();
    expect(manifest).toEqual(onDisk);
  });
});
