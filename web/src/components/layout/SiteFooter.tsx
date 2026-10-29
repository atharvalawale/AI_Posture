import { cacheLife } from "next/cache";
import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <LogoMark className="h-7 w-auto text-accent" />
            <span className="text-[19px] font-semibold">{site.name}</span>
          </div>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
            Physiotherapy plans from licensed physiotherapists, with an AI that checks every rep you do at home.
          </p>
          <p className="mt-4 text-sm text-muted">{site.appsComingSoon}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-3 text-[15px]">
          {[...site.nav.filter((i) => i.href !== "/blog"), ...site.footer].map((item) => (
            <Link key={item.href + item.label} href={item.href} className="text-muted transition-colors hover:text-text">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-3 text-[15px]">
          <a href={`mailto:${site.email}`} className="text-text underline decoration-line underline-offset-4 hover:decoration-text">
            {site.email}
          </a>
          <span className="text-muted">{site.location}</span>
        </div>
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col justify-between gap-2 py-6 text-sm text-muted md:flex-row">
          <span>
            &copy; <CopyrightYear /> {site.name}
          </span>
          <span>FiixBE supports your physiotherapist. It does not replace medical advice.</span>
        </Container>
      </div>
    </footer>
  );
}
