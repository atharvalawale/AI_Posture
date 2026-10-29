import type { Metadata } from "next";
import { ForPhysios } from "@/components/pages/ForPhysios";

export const metadata: Metadata = {
  title: "For physiotherapists",
  description:
    "Follow your patients' home exercise remotely. FiixBE measures every rep, scores form and brings each session back to you.",
  alternates: { canonical: "/for-physios" },
};

export default function ForPhysiosPage() {
  return <ForPhysios />;
}
