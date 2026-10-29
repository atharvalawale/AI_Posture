import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";
import { ClosingCta, Section, SectionHeading, bodyClass, h1Class, leadClass } from "./primitives";

type Plan = {
  id: string;
  name: string;
  tier: string;
  price: string;
  per?: string;
  summary: string;
  features: string[];
  cta: { label: string; href: string };
};

const clinicPlans: Plan[] = [
  {
    id: "solo",
    name: "Solo physio",
    tier: "Starter",
    price: "₹2,999",
    per: "per month",
    summary: "For independent physiotherapists starting with remote monitoring.",
    features: [
      "Up to 30 active patients",
      "AI rep counting and scoring",
      "Patient dashboard",
      "90 days of session history",
      "In-app messaging",
      "Email support",
    ],
    cta: { label: "Get started", href: "/contact" },
  },
  {
    id: "clinic",
    name: "Clinic",
    tier: "Professional",
    price: "₹7,999",
    per: "per month",
    summary: "For established clinics that want to see more patients and offer remote care.",
    features: [
      "Up to 150 active patients",
      "Everything in Solo physio",
      "Logins for several physios",
      "Automated PDF reports",
      "WhatsApp alerts",
      "Teleconsultation, when it launches",
      "Priority support",
      "Help with onboarding",
    ],
    cta: { label: "Get started", href: "/contact" },
  },
  {
    id: "hospital",
    name: "Hospital or chain",
    tier: "Enterprise",
    price: "Custom",
    summary: "For hospital departments, clinic chains with several locations, and healthcare groups.",
    features: [
      "Unlimited patients",
      "Everything in Clinic",
      "Unlimited physio accounts",
      "Custom exercise library",
      "EMR and HIS integration",
      "Dedicated account manager",
      "Service level agreement",
      "On-site training",
    ],
    cta: { label: "Contact sales", href: "/contact" },
  },
];

const faqs = [
  {
    q: "Is there a free trial?",
    a: (
      <>
        Yes. Every clinic plan starts with a 14-day free trial, with no credit card required. Early access clinics get 3
        months free. You can also{" "}
        <Link href="/session" className="text-text underline decoration-line underline-offset-4 hover:decoration-text">
          try a session on the web
        </Link>{" "}
        right now, with no signup.
      </>
    ),
  },
  {
    q: "Do patients need to pay separately?",
    a: "No. Basic patient access is included in your clinic subscription. Patients only pay if they choose the Premium plan.",
  },
  {
    q: "What devices does it work on?",
    a: `Today FiixBE runs in the web browser of any phone or laptop with a camera. No special hardware is needed. ${site.appsComingSoon}`,
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There are no long-term contracts, and you can export your data at any time.",
  },
  {
    q: "Is patient data secure?",
    a: "Patient data is encrypted in transit and at rest, and we follow Indian health data regulations.",
  },
];

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="mt-[5px] h-3.5 w-3.5 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}

function PlanColumn({ plan }: { plan: Plan }) {
  const titleId = `plan-${plan.id}`;
  return (
    <article aria-labelledby={titleId} className="flex flex-col p-7 md:p-8">
      <p className="text-sm text-muted">{plan.tier}</p>
      <h3 id={titleId} className="mt-1 text-[20px] font-semibold">
        {plan.name}
      </h3>
      <p className="mt-6 flex items-baseline gap-2">
        <span className="font-serif text-[44px] leading-none tracking-[-0.02em]">{plan.price}</span>
        {plan.per ? <span className="text-sm text-muted">{plan.per}</span> : null}
      </p>
      <p className={`mt-5 ${bodyClass} md:min-h-[78px]`}>{plan.summary}</p>
      <Button href={plan.cta.href} variant={plan.id === "clinic" ? "solid" : "line"} className="mt-6 w-full">
        {plan.cta.label}
      </Button>
      <ul className="mt-8 space-y-3 border-t border-line pt-7 text-[15px]">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-3">
            <Check />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function Pricing() {
  return (
    <>
      <section aria-labelledby="pricing-title">
        <Container className="pt-12 pb-16 md:pt-20 md:pb-20">
          <h1 id="pricing-title" className={`max-w-3xl ${h1Class}`}>
            Clear plans. No surprises.
          </h1>
          <p className={`mt-6 max-w-xl ${leadClass}`}>
            Pay per clinic, not per patient, and grow your practice without worrying about per-user costs.
          </p>
          <div className="mt-10 flex flex-col gap-3 border-y border-line py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[16px] text-balance">
              <span className="font-semibold">Early access:</span> the first 50 clinics get 3 months free.
            </p>
            <Link
              href="/contact"
              className="text-[16px] font-medium text-accent underline decoration-1 underline-offset-4 hover:no-underline"
            >
              Apply for early access
            </Link>
          </div>
        </Container>
      </section>

      <section aria-labelledby="clinic-plans">
        <Container className="pb-20 md:pb-28">
          <h2 id="clinic-plans" className="sr-only">
            Plans for physiotherapists and clinics
          </h2>
          <div className="grid overflow-hidden rounded-2xl border border-line max-lg:divide-y max-lg:divide-line lg:grid-cols-3 lg:divide-x lg:divide-line">
            {clinicPlans.map((plan) => (
              <div key={plan.id} className={plan.id === "clinic" ? "bg-surface" : ""}>
                <PlanColumn plan={plan} />
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-muted">Prices in Indian rupees.</p>
        </Container>
      </section>

      <Section labelledBy="patient-plans">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <SectionHeading
            id="patient-plans"
            title="For patients referred by their physio."
            intro="Your physiotherapist adds you to FiixBE. The basic plan is free."
          />
          <div className="grid border-t border-line sm:grid-cols-2 sm:gap-10">
            <article aria-labelledby="plan-basic" className="flex flex-col py-7">
              <h3 id="plan-basic" className="text-[20px] font-semibold">
                Basic
              </h3>
              <p className="mt-3 font-serif text-[36px] leading-none tracking-[-0.02em]">Free</p>
              <p className={`mt-4 ${bodyClass}`}>
                The exercises your physio assigns, with AI form correction and rep counting.
              </p>
              <div className="mt-6">
                <Button href="/session" variant="line" size="sm">
                  Try it on the web
                </Button>
              </div>
            </article>
            <article aria-labelledby="plan-premium" className="flex flex-col border-line py-7 max-sm:border-t">
              <h3 id="plan-premium" className="text-[20px] font-semibold">
                Premium
              </h3>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="font-serif text-[36px] leading-none tracking-[-0.02em]">₹499</span>
                <span className="text-sm text-muted">per month</span>
              </p>
              <p className={`mt-4 ${bodyClass}`}>
                Full session history, progress charts, messaging with your physio and appointment booking, in the
                FiixBE app.
              </p>
              <p className="mt-6 text-sm text-muted">{site.appsComingSoon}</p>
            </article>
          </div>
        </div>
      </Section>

      <Section labelledBy="pricing-faq">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <SectionHeading id="pricing-faq" title="Common questions." />
          <div className="border-t border-line">
            {faqs.map((f) => (
              <details key={f.q} className="group border-b border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M8 2.5v11M2.5 8h11" />
                  </svg>
                </summary>
                <p className={`max-w-xl pb-6 ${bodyClass}`}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      <ClosingCta
        id="pricing-cta"
        title="Talk to us about your clinic."
        body="Tell us how you practise. We will set up a plan and a free trial to match."
        actions={
          <>
            <Button href="/contact">Contact us</Button>
            <Button href="/session" variant="line">
              Try it on the web
            </Button>
          </>
        }
      />
    </>
  );
}
