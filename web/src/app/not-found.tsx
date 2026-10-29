import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page does not exist. Go back to the FiixBE homepage, read the blog or try a session on the web.",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <Container className="flex flex-1 flex-col items-center justify-center py-28 text-center">
      <p className="text-sm text-muted">Error 404</p>
      <h1 className="mt-4 max-w-xl text-balance font-serif text-[40px] leading-[1.04] tracking-[-0.02em] md:text-[56px]">
        We could not find that page
      </h1>
      <p className="mt-5 max-w-md text-[17px] leading-relaxed text-muted">
        The link may be old or mistyped. These are good places to start instead.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button href="/">Back to the homepage</Button>
        <Button href="/blog" variant="line">
          Read the blog
        </Button>
      </div>
    </Container>
  );
}
