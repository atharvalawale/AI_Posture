import { BothSides } from "@/components/home/BothSides";
import { ClosingCta } from "@/components/home/ClosingCta";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Problem } from "@/components/home/Problem";
import { HomeStage } from "@/components/phone-stage/HomeStage";

export default function HomePage() {
  return (
    <>
      <HomeStage />
      <Problem />
      <HowItWorks />
      <BothSides />
      <ClosingCta />
    </>
  );
}
