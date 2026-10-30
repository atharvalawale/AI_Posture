import { Section, SectionHeading } from "@/components/pages/primitives";
import { Showcase, type ShowcaseItem } from "@/components/showcase/Showcase";
import { Button } from "@/components/ui/Button";
import { PracticePanel } from "./how/PracticePanel";
import { PrescribePanel } from "./how/PrescribePanel";
import { ReviewPanel } from "./how/ReviewPanel";

const steps: ShowcaseItem[] = [
  { id: "prescribe", title: "Prescribe", body: "Your physio sets your exercises and the angle to reach." },
  { id: "practice", title: "Practice", body: "FiixBE counts every rep and corrects you out loud." },
  { id: "review", title: "Review", body: "Your physio sees every rep and adjusts your plan." },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works" labelledBy="how-title">
      <SectionHeading id="how-title" title="From prescription to recovery." intro="Three steps, and your physiotherapist stays in the loop for all of them." />
      <Showcase
        className="mt-14"
        label="How FiixBE works"
        items={steps}
        panels={[<PrescribePanel key="prescribe" />, <PracticePanel key="practice" />, <ReviewPanel key="review" />]}
        layout="steps"
        autoAdvanceMs={5000}
      />
      <div className="mt-12">
        <Button href="/session" variant="line">
          Try a live session
        </Button>
      </div>
    </Section>
  );
}
