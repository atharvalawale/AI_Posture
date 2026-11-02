// Writes the list of blog slugs that src/proxy.ts uses to answer unknown slugs with a real 404.
// Cache Components streams /blog/[slug] with a 200 before the page can call notFound(), and
// `dynamicParams = false` is not available with Cache Components, so the check happens in proxy.
import { readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const slugs = readdirSync(join(root, "content/blog"))
  .filter((file) => file.endsWith(".md") && !file.startsWith("."))
  .map((file) => file.slice(0, -3))
  .sort();

writeFileSync(join(root, "src/lib/blog-manifest.json"), JSON.stringify(slugs, null, 2) + "\n");
console.log(`blog-manifest: ${slugs.length} slugs`);
