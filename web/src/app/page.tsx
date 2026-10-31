import type { Metadata } from "next";
import { BothSides } from "@/components/home/BothSides";
import { ClosingCta } from "@/components/home/ClosingCta";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Problem } from "@/components/home/Problem";
import { HomeStage } from "@/components/phone-stage/HomeStage";
import { absoluteUrl, JsonLd, organization, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({ path: "/" });

// Google reads the site name from WebSite and the logo from Organization, on the homepage only.
const structuredData = {
  "@graph": [
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      name: site.name,
      alternateName: ["Fiixbee", site.domain],
      url: absoluteUrl("/"),
      inLanguage: "en-IN",
      publisher: { "@id": organization["@id"] },
    },
    organization,
  ],
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={structuredData} />
      <HomeStage />
      <Problem />
      <HowItWorks />
      <BothSides />
      <ClosingCta />
    </>
  );
}
