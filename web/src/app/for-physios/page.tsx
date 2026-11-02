import type { Metadata } from "next";
import { ForPhysios } from "@/components/pages/ForPhysios";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Remote patient monitoring for physiotherapists",
  description:
    "Home exercise program software for physiotherapists in India. FiixBE measures every rep your patients do at home and brings each session back to you.",
  path: "/for-physios",
});

export default function ForPhysiosPage() {
  return <ForPhysios />;
}
