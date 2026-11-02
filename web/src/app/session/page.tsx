import type { Metadata } from "next";
import { SessionFlow } from "@/components/session/SessionFlow";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Try AI physiotherapy free in your browser",
  description:
    "Do a physiotherapy exercise in your browser, free. FiixBE's AI counts your reps and checks your form through your camera. No app to install.",
  path: "/session",
});

export default function SessionPage() {
  return <SessionFlow />;
}
