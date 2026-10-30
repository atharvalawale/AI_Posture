import { PhysioDashboard } from "@/components/physios/PhysioDashboard";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";
import { ClosingCta, RuleList, Section, SectionHeading, bodyClass, h1Class, leadClass, type Item } from "./primitives";

const featureGroups: { title: string; items: Item[] }[] = [
  {
    title: "See every session",
    items: [
      {
        title: "AI form analysis",
        body: "FiixBE watches every rep your patient does at home and measures joint angles, range of motion and smoothness.",
      },
      {
        title: "Patient dashboard",
        body: "All your patients in one place: rep scores, angle data, session history and compliance, updated live.",
      },
      {
        title: "Smart alerts",
        body: "A notification when a patient misses a session, scores below your threshold or needs your attention.",
      },
    ],
  },
  {
    title: "Prescribe and follow up",
    items: [
      {
        title: "Exercise prescription",
        body: "Assign exercises from a library of physio-validated movements. Set reps, hold time and difficulty per patient.",
      },
      {
        title: "Progress reports",
        body: "A PDF report for each patient every week. Share it with them or use it for insurance paperwork.",
      },
      {
        title: "Messaging",
        body: "Chat with patients in the app. Send voice notes, corrections and encouragement.",
      },
    ],
  },
  {
    title: "Run your practice",
    items: [
      { title: "Appointment booking", body: "Patients book in-clinic or video appointments with you directly." },
      { title: "Teleconsultation", body: "Video consultations inside FiixBE, with no third-party tools. Planned." },
      {
        title: "Multi-clinic support",
        body: "Running more than one location? Manage every clinic, physio and patient under one account.",
      },
    ],
  },
];

const practices = [
  {
    title: "Standalone clinics",
    body: "See more patients without hiring more staff. Follow home exercise between visits and keep clinic time for complex cases.",
  },
  {
    title: "Hospital departments",
    body: "Streamline post-operative rehab. Discharge patients knowing their home exercise is supervised.",
  },
  {
    title: "Independent physios",
    body: "Build your own practice and reach patients wherever they live in India.",
  },
] as const;

export function ForPhysios() {
  return (
    <>
      <section aria-labelledby="physios-title">
        <Container className="pt-12 pb-20 md:pt-20 lg:pb-28">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:gap-16">
            <h1 id="physios-title" className={h1Class}>
              Grow your practice beyond the clinic.
            </h1>
            <div>
              <p className={leadClass}>
                Follow your patients&apos; home exercise remotely, with data you have never had before. Spend clinic
                time on the patients who need your hands.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button href="/contact">Become a founding partner</Button>
                <Button href="/session" variant="line">
                  Try it on the web
                </Button>
              </div>
            </div>
          </div>
          <PhysioDashboard className="mt-14" />
        </Container>
      </section>

      <Section labelledBy="physios-features">
        <SectionHeading
          id="physios-features"
          title="Everything you need to run a remote physio practice."
          intro="You write the plan. FiixBE measures every rep at home and brings the results back to you."
        />
        <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
          {featureGroups.map((group) => (
            <div key={group.title}>
              <h3 className="font-serif text-[24px] leading-tight tracking-[-0.01em]">{group.title}</h3>
              <RuleList items={group.items} className="mt-5" />
            </div>
          ))}
        </div>
      </Section>

      <Section labelledBy="physios-practices">
        <SectionHeading id="physios-practices" title="Built for every kind of practice." />
        <ul className="mt-12 border-t border-line">
          {practices.map((p) => (
            <li key={p.title} className="grid gap-2 border-b border-line py-7 md:grid-cols-[1fr_1.6fr] md:gap-8 md:py-9">
              <h3 className="font-serif text-[24px] leading-tight tracking-[-0.01em] md:text-[28px]">{p.title}</h3>
              <p className={`max-w-xl ${bodyClass} md:text-[17px]`}>{p.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <ClosingCta
        id="physios-cta"
        title="Join our founding physio network."
        body="We are onboarding 50 founding physio partners across Pune and Mumbai. Founding partners get 3 months free and dedicated onboarding support."
        actions={
          <>
            <Button href="/contact">Apply as a founding partner</Button>
            <Button href="/session" variant="line">
              Try it on the web
            </Button>
          </>
        }
        note={site.appsComingSoon}
      />
    </>
  );
}
