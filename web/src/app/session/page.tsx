import type { Metadata } from "next";
import { SessionFlow } from "@/components/session/SessionFlow";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Try it on the web",
  description: "Do a physiotherapy exercise in your browser. FiixBE counts your reps and checks your form through your camera.",
  path: "/session",
});

export default function SessionPage() {
  return <SessionFlow />;
}
