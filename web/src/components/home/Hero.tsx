import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";

export function Hero() {
  return (
    <section aria-labelledby="hero-title">
      <Container className="pt-12 text-center md:pt-20">
        <h1
          id="hero-title"
          className="mx-auto max-w-[14ch] font-serif text-[40px] leading-[1.06] tracking-[-0.02em] text-balance sm:text-[56px] lg:text-[72px] lg:leading-[1.02] lg:tracking-[-0.025em]"
        >
          See every degree of your recovery.
        </h1>
        <p className="mx-auto mt-6 max-w-[34rem] text-lg leading-relaxed text-pretty text-muted md:text-xl md:leading-relaxed">
          Your physiotherapist sets the plan. FiixBE watches every rep through your phone camera and reports back to them.
        </p>
        <div className="mx-auto mt-9 flex max-w-sm flex-col justify-center gap-3 sm:max-w-none sm:flex-row">
          <Button href="/session">Start your recovery</Button>
          <Button href="/for-physios" variant="line">
            For physiotherapists
          </Button>
        </div>
        <p className="mt-5 text-sm text-muted">{site.appsComingSoon}</p>
      </Container>
    </section>
  );
}
