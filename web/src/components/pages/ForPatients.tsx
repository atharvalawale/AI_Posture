import Link from "next/link";
import { BodyMap } from "@/components/patients/BodyMap";
import { GuidePanel, PlanPanel, ProgressPanel } from "@/components/patients/PatientStepPanels";
import { RecoverySlider } from "@/components/patients/RecoverySlider";
import { SessionDemos } from "@/components/patients/SessionDemos";
import { Showcase, type ShowcaseItem } from "@/components/showcase/Showcase";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";
import {
  ClosingCta,
  Section,
  SectionHeading,
  bodyClass,
  h1Class,
  h3Class,
  leadClass,
} from "./primitives";

const facts = [
  { title: "Just your phone", body: "No sensors, wearables or extra equipment. Prop your phone up and start." },
  { title: "Your physio's plan", body: "Every exercise comes from your physiotherapist, not from a generic workout app." },
  { title: "A fraction of the cost", body: "Guided exercise at home, without a trip to the clinic for every session." },
] as const;

const steps: ShowcaseItem[] = [
  { id: "plan", title: "Get your plan", shortTitle: "Plan", body: "Your physio writes your plan and it arrives in the app." },
  { id: "camera", title: "Exercise with the camera on", shortTitle: "Exercise", body: "Prop your phone up so your whole body fits the guide." },
  { id: "progress", title: "Track your progress", shortTitle: "Progress", body: "Your deepest bend improves week by week, and your physio sees it." },
];

const withTheApps = [
  { title: "Session history", body: "Every session is saved, so you can see how you have improved over days and weeks." },
  { title: "Exercise reminders", body: "Gentle reminders when it is time to exercise. Consistency is what drives recovery." },
  { title: "Message your physio", body: "Ask your physio a question in the app, without waiting for your next appointment." },
] as const;

export function ForPatients() {
  return (
    <>
      <section aria-labelledby="patients-title">
        <Container className="grid items-center gap-12 pt-12 pb-20 md:pt-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 lg:pb-28">
          <div>
            <h1 id="patients-title" className={h1Class}>
              Recover at home, at your own pace.
            </h1>
            <p className={`mt-6 max-w-xl ${leadClass}`}>
              Do the physiotherapy exercises your physiotherapist prescribes at home, with live AI guidance on every
              rep. Your phone camera is all you need.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href="/session">Try it on the web</Button>
              <Button href="#how-it-works" variant="line">
                How it works
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted">{site.appsComingSoon}</p>
          </div>
          <RecoverySlider />
        </Container>
      </section>

      <section aria-label="Why FiixBE" className="border-t border-line">
        <Container>
          <ul className="grid md:grid-cols-3 md:divide-x md:divide-line">
            {facts.map((f, i) => (
              <li
                key={f.title}
                className={`py-8 md:px-8 md:py-10 md:first:pl-0 md:last:pr-0 ${i > 0 ? "max-md:border-t max-md:border-line" : ""}`}
              >
                <h2 className={h3Class}>{f.title}</h2>
                <p className={`mt-2 ${bodyClass}`}>{f.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Section id="how-it-works" labelledBy="patients-how">
        <SectionHeading id="patients-how" title="As simple as pointing your phone at yourself." />
        <Showcase
          className="mt-14"
          label="How FiixBE works for you"
          items={steps}
          panels={[<PlanPanel key="plan" />, <GuidePanel key="guide" />, <ProgressPanel key="progress" />]}
          layout="steps"
          autoAdvanceMs={5000}
        />
        {/* A 44 px tall target. The smaller margin keeps the text where it was. */}
        <p className="mt-10 text-[16px]">
          <Link href="/session" className="inline-flex min-h-11 items-center font-medium text-accent underline decoration-1 underline-offset-4 hover:no-underline">
            Try a session now. No signup needed.
          </Link>
        </p>
      </Section>

      <Section labelledBy="patients-features">
        <SectionHeading
          id="patients-features"
          title="Your physio's eyes, between visits."
          intro="FiixBE does not replace your physiotherapist. It keeps watch while you exercise, so they know how every session went."
        />
        <h3 className="mt-14 text-[15px] text-muted">In every session today</h3>
        <div className="mt-4">
          <SessionDemos />
        </div>
        <h3 className="mt-16 text-[15px] text-muted">Coming with the iPhone and Android apps</h3>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3 lg:gap-5">
          {withTheApps.map((item) => (
            <li key={item.title} className="rounded-xl border border-line bg-surface p-5">
              <h4 className={h3Class}>{item.title}</h4>
              <p className={`mt-1.5 ${bodyClass}`}>{item.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section labelledBy="patients-conditions">
        <SectionHeading
          id="patients-conditions"
          title="Built for rehab after surgery and injury."
          intro="Your physiotherapist decides whether FiixBE suits your recovery, and which exercises you do."
        />
        <div className="mt-14">
          <BodyMap />
        </div>
      </Section>

      <ClosingCta
        id="patients-cta"
        title="Try FiixBE on the web, right now."
        body="No signup needed. Allow camera access and start your first session in your browser."
        actions={<Button href="/session">Try it on the web</Button>}
        note={site.appsComingSoon}
      />
    </>
  );
}
