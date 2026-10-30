import { RuleList, Section, SectionHeading } from "@/components/pages/primitives";
import { WeekCompare } from "./WeekCompare";

const problems = [
  {
    title: "Clinic visits add up",
    body: "Several sessions a week, for months, is more time and money than most families can keep up.",
  },
  {
    title: "No one watches at home",
    body: "Patients go home with an exercise sheet and no feedback. Wrong form slows recovery and can cause new injuries.",
  },
  {
    title: "Distance is a barrier",
    body: "Outside the big cities, a qualified physiotherapist can be hours away.",
  },
] as const;

export function Problem() {
  return (
    <Section labelledBy="problem-title" className="grid items-start gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <div>
        <SectionHeading
          id="problem-title"
          title="Home exercise is where recovery stalls."
          intro="Most recovery happens between clinic visits, alone, from a printed sheet. That is the part FiixBE is built for."
        />
        <RuleList items={problems} className="mt-10" />
      </div>
      <WeekCompare className="lg:mt-2" />
    </Section>
  );
}
