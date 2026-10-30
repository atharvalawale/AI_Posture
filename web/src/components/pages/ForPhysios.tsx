import { FeatureTabs } from "@/components/physios/FeatureTabs";
import { PhysioDashboard } from "@/components/physios/PhysioDashboard";
import { PracticeShowcase } from "@/components/physios/PracticeShowcase";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";
import { ClosingCta, Section, SectionHeading, h1Class, leadClass } from "./primitives";

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
        <FeatureTabs className="mt-12" />
      </Section>

      <Section labelledBy="physios-practices">
        <SectionHeading id="physios-practices" title="Built for every kind of practice." />
        <PracticeShowcase className="mt-12" />
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
