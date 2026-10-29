import { BothSides } from "@/components/home/BothSides";
import { ClosingCta } from "@/components/home/ClosingCta";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Problem } from "@/components/home/Problem";
import { PhoneStage, type StageNote } from "@/components/phone-stage/PhoneStage";

const notes: StageNote[] = [
  { title: "Counts every rep", body: "Only full, controlled reps count.", screen: "live" },
  { title: "Measures your joints", body: "Knee, hip and shoulder angles, on every rep.", screen: "live" },
  { title: "Corrects you out loud", body: "“Lower slowly.” “Good depth, hold.” Then a score for your form.", screen: "summary" },
  { title: "Keeps your physio close", body: "They review each session and adjust your plan.", screen: "plan" },
];

export default function HomePage() {
  return (
    <>
      <Hero />
      <PhoneStage notes={notes} />
      <Problem />
      <HowItWorks />
      <BothSides />
      <ClosingCta />
    </>
  );
}
