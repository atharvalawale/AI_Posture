import type { Metadata } from "next";
import { SessionFlow } from "@/components/session/SessionFlow";

export const metadata: Metadata = {
  title: "Try it on the web",
  description: "Do a physiotherapy exercise in your browser. FiixBE counts your reps and checks your form through your camera.",
  alternates: { canonical: "/session" },
};

export default function SessionPage() {
  return <SessionFlow />;
}
