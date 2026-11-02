import { cacheLife } from "next/cache";
import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { CookieSettingsButton } from "@/components/consent/CookieBanner";
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
      <Container className="grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <LogoMark className="h-7 w-auto text-accent" />
            <span className="text-[19px] font-semibold">{site.name}</span>
          </div>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
            Physiotherapy plans from licensed physiotherapists, with an AI that checks every rep you do at home.
          </p>
          <p className="mt-4 text-sm text-muted">{site.appsComingSoon}</p>
        </div>
        {/* The sitemap: every page, grouped. Headings sit level with the logo, and each link is a 44 px tall row. */}
        {site.footer.map((group) => (
          <nav key={group.label} aria-labelledby={`footer-${group.label}`} className="text-[15px]">
            <p id={`footer-${group.label}`} className="flex h-7 items-center font-semibold text-text">
              {group.label}
            </p>
            <ul className="mt-1.5">
              {group.links.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="flex min-h-11 items-center text-muted transition-colors hover:text-text">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="col-span-2 text-[15px] md:col-span-1">
          <p className="flex h-7 items-center font-semibold text-text">Get in touch</p>
          <a
            href={`mailto:${site.email}`}
            className="mt-1.5 flex min-h-11 items-center text-muted underline decoration-line underline-offset-4 transition-colors hover:text-text hover:decoration-text"
          >
            {site.email}
          </a>
          <p className="text-muted">{site.location}</p>
        </div>
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col justify-between gap-2 py-6 text-sm text-muted md:flex-row">
          <span className="flex flex-wrap items-center gap-x-5">
            <span>
              &copy; <CopyrightYear /> {site.name}
            </span>
            <CookieSettingsButton className="min-h-11 transition-colors hover:text-text md:min-h-0" />
          </span>
          <span>FiixBE supports your physiotherapist. It does not replace medical advice.</span>
        </Container>
      </div>
    </footer>
  );
}
