import type { Metadata } from "next";
import { ForPatients } from "@/components/pages/ForPatients";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Physiotherapy exercises at home, checked by AI",
  description:
    "Do your physiotherapy exercises at home with live AI guidance on every rep. For knee, shoulder, hip and sports injury rehab. Try it free on the web.",
  path: "/for-patients",
});

export default function ForPatientsPage() {
  return <ForPatients />;
}
