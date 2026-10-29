import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";
import { ClosingCta, Photo, RuleColumns, Section, SectionHeading, bodyClass, h1Class, h2Class, leadClass } from "./primitives";

const values = [
  {
    title: "Accuracy first",
    body: "Our pose tracking is built on Google's MediaPipe. We do not ship a feature until it is accurate enough to help real patients recover.",
  },
  {
    title: "Physios first",
    body: "We are not replacing physiotherapists. We build tools that extend their reach, and we design every feature with practising physios.",
  },
  {
    title: "India first",
    body: "Built in Pune, priced for India, and designed for Indian patients and physios. We will grow beyond India, but this is home.",
  },
] as const;

const team: { name: string; role?: string; body: string }[] = [
  {
    name: "Shreyas Jadhav",
    role: "Founder and CEO",
    body: "AI and machine learning engineer focused on computer vision and pose detection. Built the engine behind FiixBE's real-time scoring.",
  },
  {
    name: "Co-founder and CTO",
    body: "Full-stack engineer working on real-time systems, FastAPI, WebSocket architecture and mobile development.",
  },
  {
    name: "Clinical advisor",
    body: "A practising physiotherapist who guides our exercise library, scoring logic and clinical accuracy.",
  },
];

const roadmap = [
  {
    when: "Done",
    title: "The AI engine",
    body: "Real-time pose tracking, rep counting and scoring for knee extension, shoulder raises and straight leg raises.",
    link: { href: "/session", label: "Try it on the web" },
  },
  {
    when: "Building now",
    title: "Mobile apps and the physio dashboard",
    body: `A web dashboard for physios, accounts and saved sessions. ${site.appsComingSoon}`,
  },
  {
    when: "Next",
    title: "Pilot with founding clinics",
    body: "FiixBE in daily use with our founding physio partners in Pune and Mumbai. Real feedback, real iteration.",
  },
  {
    when: "After that",
    title: "Teleconsultation",
    body: "Video calls between patient and physio, appointment booking and WhatsApp notifications.",
  },
  {
    when: "Later",
    title: "Across India, then beyond",
    body: "Hindi and regional languages, smaller cities and towns, then the Middle East and Southeast Asia. Hospital partnerships and insurance integrations.",
  },
];

export function About() {
  return (
    <>
      <section aria-labelledby="about-title">
        <Container className="pt-12 pb-20 md:pt-20 lg:pb-28">
          <h1 id="about-title" className={`max-w-4xl ${h1Class}`}>
            Built from a simple frustration.
          </h1>
          <p className={`mt-6 max-w-xl ${leadClass}`}>
            We watched family members struggle with physiotherapy at home. They did exercises the wrong way, skipped
            sessions and never knew if they were getting better. So we built the tool we wished they had.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href="/session">Try it on the web</Button>
            <Button href="/contact" variant="line">
              Contact us
            </Button>
          </div>
          <Photo
            src="/images/pages/physio-dumbbells.webp"
            alt="A physiotherapist guiding a patient's arm as she lifts a light dumbbell"
            className="mt-14 aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]"
            sizes="(min-width: 1200px) 1120px, 100vw"
            position="50% 40%"
            preload
          />
        </Container>
      </section>

      <Section labelledBy="about-mission">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <h2 id="about-mission" className={h2Class}>
            Make quality physiotherapy reachable for every Indian.
          </h2>
          <div className={`max-w-xl space-y-5 ${bodyClass} md:text-[17px]`}>
            <p>
              Many people in India need physiotherapy every year. Good care is concentrated in the big cities, and
              it works best for people who can afford clinic visits several times a week.
            </p>
            <p>
              We believe computer vision can change that. A smartphone camera is enough to give a patient real-time
              guidance on every rep, with their physiotherapist still in charge of the plan.
            </p>
            <p>We are starting in Pune and Mumbai. Our aim is every city, town and village in India, and then beyond.</p>
          </div>
        </div>
        <div className="mt-20">
          <RuleColumns items={values} />
        </div>
      </Section>

      <Section labelledBy="about-team">
        <SectionHeading id="about-team" title="The people building FiixBE." />
        <ul className="mt-12 border-t border-line">
          {team.map((m) => (
            <li key={m.name} className="grid gap-2 border-b border-line py-7 md:grid-cols-[1fr_1.6fr] md:gap-8">
              <div>
                <h3 className="text-[17px] font-semibold">{m.name}</h3>
                {m.role ? <p className="mt-0.5 text-[15px] text-muted">{m.role}</p> : null}
              </div>
              <p className={`max-w-xl ${bodyClass}`}>{m.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-[16px]">
          We are hiring.{" "}
          <Link href="/contact" className="font-medium text-accent underline decoration-1 underline-offset-4 hover:no-underline">
            Get in touch
          </Link>{" "}
          if you want to help build the future of physiotherapy.
        </p>
      </Section>

      <Section labelledBy="about-roadmap">
        <SectionHeading id="about-roadmap" title="Where we are going." />
        <ol className="mt-12 border-t border-line">
          {roadmap.map((step) => (
            <li key={step.title} className="grid gap-2 border-b border-line py-7 md:grid-cols-[1fr_1.6fr] md:gap-8">
              <p className={`text-[15px] ${step.when === "Done" ? "text-accent" : "text-muted"}`}>{step.when}</p>
              <div className="max-w-xl">
                <h3 className="text-[17px] font-semibold">{step.title}</h3>
                <p className={`mt-1.5 ${bodyClass}`}>{step.body}</p>
                {step.link ? (
                  <Link
                    href={step.link.href}
                    className="mt-3 inline-block text-[15px] font-medium text-accent underline decoration-1 underline-offset-4 hover:no-underline"
                  >
                    {step.link.label}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <ClosingCta
        id="about-cta"
        title="See it for yourself."
        body="Start a session in your browser. No signup, no download. Just allow camera access."
        actions={
          <>
            <Button href="/session">Try it on the web</Button>
            <Button href="/contact" variant="line">
              Contact us
            </Button>
          </>
        }
      />
    </>
  );
}
