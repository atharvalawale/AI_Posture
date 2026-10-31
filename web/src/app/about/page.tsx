import type { Metadata } from "next";
import { About } from "@/components/pages/About";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About us: AI physiotherapy built in Pune, India",
  description:
    "Why we are building FiixBE, an AI physiotherapy app: quality physiotherapy at home for every Indian, with licensed physiotherapists in charge.",
  path: "/about",
});

export default function AboutPage() {
  return <About />;
}
