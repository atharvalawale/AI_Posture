export const site = {
  name: "FiixBE",
  email: "hello@fiixbee.com",
  domain: "fiixbee.com",
  // The apex domain redirects here, so canonicals, the sitemap and share links all use www.
  url: "https://www.fiixbee.com",
  location: "Pune and Mumbai, India",
  /** Google Analytics 4 measurement ID. */
  analyticsId: "G-QG1FXR5YHV",
  appsComingSoon: "iPhone and Android apps coming soon.",
  tagline: "Physiotherapy that watches every rep",
  nav: [
    { href: "/#how-it-works", label: "How it works" },
    { href: "/for-patients", label: "For patients" },
    { href: "/for-physios", label: "For physios" },
    { href: "/pricing", label: "Pricing" },
    { href: "/blog", label: "Blog" },
  ],
  /** The footer sitemap: every page on the site, grouped. */
  footer: [
    {
      label: "Product",
      links: [
        { href: "/#how-it-works", label: "How it works" },
        { href: "/for-patients", label: "For patients" },
        { href: "/for-physios", label: "For physios" },
        { href: "/pricing", label: "Pricing" },
        { href: "/session", label: "Try it on the web" },
      ],
    },
    {
      label: "Company",
      links: [
        { href: "/about", label: "About" },
        { href: "/blog", label: "Blog" },
        { href: "/contact", label: "Contact" },
      ],
    },
  ],
} as const;
