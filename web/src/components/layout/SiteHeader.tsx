"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile menu after navigation. Routes stay mounted (Activity), so state would persist.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 h-(--header-h) border-b border-line bg-bg">
      <Container className="flex h-full items-center justify-between gap-6">
        <Logo />
        {/* Each link is a 44 px tall target, padded so even "Blog" is 44 px wide. The padding takes the place of the gap. */}
        <nav aria-label="Main" className="hidden items-center gap-3 lg:flex">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex h-11 items-center px-2 text-sm transition-colors hover:text-text ${pathname === item.href ? "text-text" : "text-muted"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button href="/session" size="sm" className="max-lg:hidden">
            Try it on the web
          </Button>
          <button
            type="button"
            className="-mr-1 inline-flex size-11 items-center justify-center rounded-lg text-text lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </Container>
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-(--header-h) z-40 overflow-y-auto bg-bg lg:hidden">
          <Container className="flex flex-col py-6">
            {[...site.nav, { href: "/about", label: "About" }, { href: "/contact", label: "Contact" }].map((item) => (
              <Link key={item.href} href={item.href} className="border-b border-line py-4 font-serif text-[28px] leading-tight text-text">
                {item.label}
              </Link>
            ))}
            <Button href="/session" className="mt-8">
              Try it on the web
            </Button>
            <p className="mt-4 text-center text-sm text-muted">{site.appsComingSoon}</p>
          </Container>
        </div>
      )}
    </header>
  );
}
