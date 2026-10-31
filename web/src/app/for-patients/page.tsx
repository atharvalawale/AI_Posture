import type { Metadata } from "next";
import { ForPatients } from "@/components/pages/ForPatients";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "For patients",
  description:
    "Do the exercises your physiotherapist prescribes at home, with live guidance on every rep from your phone camera. Try FiixBE on the web.",
  path: "/for-patients",
});

export default function ForPatientsPage() {
  return <ForPatients />;
}
