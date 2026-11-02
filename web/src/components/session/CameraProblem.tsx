"use client";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import type { CameraProblem as Problem } from "./useCamera";

const COPY: Record<Problem, { title: string; body: string }> = {
  denied: {
    title: "We need your camera",
    body: "FiixBE watches your movement through the camera to count your reps and check your form. Allow camera access for this site in your browser settings, then try again.",
  },
  "no-camera": {
    title: "We could not find a camera",
    body: "Connect a camera, or open this page on your phone, then try again.",
  },
  busy: {
    title: "Your camera is busy",
    body: "Another app or browser tab may be using it. Close it, then try again.",
  },
  unsupported: {
    title: "This browser cannot open the camera",
    body: "Open this page in a recent version of Chrome, Safari, Firefox or Edge, over a secure (https) connection.",
  },
  error: {
    title: "The camera did not start",
    body: "Something went wrong while opening the camera. Try again, or reload the page.",
  },
};

export function CameraProblem({ problem, onRetry, onBack }: { problem: Problem; onRetry: () => void; onBack: () => void }) {
  const copy = COPY[problem];
  return (
    <Container className="max-w-[680px] py-20 md:py-28">
      <div role="alert">
        <h1 className="font-serif text-[38px] font-normal leading-[1.08] tracking-[-0.02em] md:text-[52px]">{copy.title}</h1>
        <p className="mt-4 max-w-[54ch] text-[17px] leading-relaxed text-muted">{copy.body}</p>
      </div>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onRetry}>Try again</Button>
        <Button variant="line" onClick={onBack}>
          Back
        </Button>
      </div>
    </Container>
  );
}
