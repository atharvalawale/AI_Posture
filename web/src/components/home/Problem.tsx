import { RuleList, Section, SectionHeading, bodyClass } from "@/components/pages/primitives";

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

const changes = [
  "Your phone camera watches your form on every rep, live.",
  "Reps are counted for you, and every rep gets a score from 0 to 100.",
  "Your physiotherapist sees every session without you travelling to the clinic.",
  "It runs in the browser on any phone with a camera. No extra hardware.",
] as const;

export function Problem() {
  return (
    <Section labelledBy="problem-title" className="grid gap-12 lg:grid-cols-2 lg:gap-20">
      <div>
        <SectionHeading
          id="problem-title"
          title="Home exercise is where recovery stalls."
          intro="Most recovery happens between clinic visits, alone, from a printed sheet. That is the part FiixBE is built for."
        />
        <div className="mt-10 rounded-2xl bg-surface-2 p-6 md:p-8">
          <h3 className="text-[17px] font-semibold leading-snug">What FiixBE changes</h3>
          <ul className="mt-4 grid gap-3">
            {changes.map((c) => (
              <li key={c} className={`flex gap-3 ${bodyClass}`}>
                <svg viewBox="0 0 24 24" className="mt-[5px] h-4 w-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <RuleList items={problems} className="self-start lg:mt-2" />
    </Section>
  );
}
