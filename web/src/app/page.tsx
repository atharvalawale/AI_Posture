import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";

// Placeholder until Task 5 builds the homepage.
export default function HomePage() {
  return (
    <Container className="py-24 text-center">
      <h1 className="mx-auto max-w-3xl font-serif text-[44px] leading-[1.02] tracking-[-0.02em] md:text-[68px]">
        See every degree of your recovery.
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
        Your physiotherapist sets the plan. FiixBE watches every rep through your phone camera and reports back to them.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button href="/session">Start your recovery</Button>
        <Button href="/for-physios" variant="line">
          For physiotherapists
        </Button>
      </div>
      <p className="mt-5 text-sm text-muted">{site.appsComingSoon}</p>
    </Container>
  );
}
