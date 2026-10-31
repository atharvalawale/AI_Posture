import type { Metadata, Viewport } from "next";
import { fonts } from "./fonts";
import "./globals.css";
import { CookieBanner } from "@/components/consent/CookieBanner";
import { GoogleAnalytics } from "@/components/consent/GoogleAnalytics";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { baseOpenGraph } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} - ${site.tagline}`, template: `%s | ${site.name}` },
  description:
    "Your physiotherapist sets the plan. FiixBE watches every rep through your phone camera, corrects your form as you move and reports back to them.",
  applicationName: site.name,
  openGraph: baseOpenGraph,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f10" },
  ],
};

/**
 * Without JavaScript a browser shows its own controls on every video, and the pose clips cannot play or draw
 * their skeleton anyway. They step aside, and the poster behind each one shows instead.
 */
const NO_SCRIPT = "<style>video[data-pose-video]{visibility:hidden}</style>";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" suppressHydrationWarning className={`${fonts.serif.variable} ${fonts.sans.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <ThemeProvider>
          <SiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
          <CookieBanner />
        </ThemeProvider>
        <GoogleAnalytics />
        <noscript dangerouslySetInnerHTML={{ __html: NO_SCRIPT }} />
      </body>
    </html>
  );
}
