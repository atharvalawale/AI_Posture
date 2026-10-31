import type { Metadata } from "next";
import { ForPhysios } from "@/components/pages/ForPhysios";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "For physiotherapists",
  description:
    "Follow your patients' home exercise remotely. FiixBE measures every rep, scores form and brings each session back to you.",
  path: "/for-physios",
});

export default function ForPhysiosPage() {
  return <ForPhysios />;
}
