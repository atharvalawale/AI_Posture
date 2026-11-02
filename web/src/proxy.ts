import { type NextRequest, NextResponse } from "next/server";
import slugs from "@/lib/blog-manifest.json";

const known = new Set<string>(slugs);

// Unknown blog slugs get a real 404 status. Without this, Cache Components streams the page shell
// with a 200 before the page can call notFound(). See scripts/blog-manifest.mjs.
export function proxy(request: NextRequest) {
  const slug = decodeURIComponent(request.nextUrl.pathname.slice("/blog/".length)).replace(/\/$/, "");
  if (known.has(slug)) return NextResponse.next();
  // Render the site's 404 page. Set the status explicitly: Vercel serves the prerendered
  // not-found route with 200 when it is the target of a rewrite.
  return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
}

export const config = {
  matcher: "/blog/:slug",
};
