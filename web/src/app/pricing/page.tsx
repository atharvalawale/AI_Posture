import type { Metadata } from "next";
import { Pricing } from "@/components/pages/Pricing";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "Clinic plans priced per clinic, not per patient, with a free basic plan for patients. The first 50 clinics get 3 months free.",
  path: "/pricing",
});

export default function PricingPage() {
  return <Pricing />;
}
