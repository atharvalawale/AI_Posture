import type { Metadata } from "next";
import { About } from "@/components/pages/About";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description:
    "Why we are building FiixBE: quality physiotherapy at home for every Indian, with licensed physiotherapists in charge of the plan.",
  path: "/about",
});

export default function AboutPage() {
  return <About />;
}
