import type { Metadata } from "next";
import { About } from "@/components/pages/About";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why we are building FiixBE: quality physiotherapy at home for every Indian, with licensed physiotherapists in charge of the plan.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <About />;
}
