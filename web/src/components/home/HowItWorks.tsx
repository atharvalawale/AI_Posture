import { RuleColumns, Section, SectionHeading } from "@/components/pages/primitives";
import { Button } from "@/components/ui/Button";

const steps = [
  {
    title: "Prescribe",
    body: "Your physiotherapist builds your exercise plan. It reaches your phone straight away.",
  },
  {
    title: "Practice",
    body: "Prop your phone up and exercise. FiixBE counts every rep, measures your joints and tells you out loud how to fix your form.",
  },
  {
    title: "Review",
    body: "Every session is saved. Your physio sees rep scores, joint angles and completion, and adjusts your plan.",
  },
] as const;

export function HowItWorks() {
  return (
    <Section id="how-it-works" labelledBy="how-title">
      <SectionHeading id="how-title" title="From prescription to recovery." intro="Three steps, and your physiotherapist stays in the loop for all of them." />
      <div className="mt-14">
        <RuleColumns items={steps} numbered />
      </div>
      <div className="mt-12">
        <Button href="/session" variant="line">
          Try a live session
        </Button>
      </div>
    </Section>
  );
}
