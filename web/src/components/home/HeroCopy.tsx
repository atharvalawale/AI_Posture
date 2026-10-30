import { Button } from "@/components/ui/Button";
import { site } from "@/lib/site";

/**
 * The homepage headline, lead and calls to action. Centered on phones and tablets, left-aligned in
 * the desktop stage, where the headline is sized from the column (a size container) so it stays on two lines.
 */
export function HeroCopy({ className = "" }: { className?: string }) {
  return (
    <div className={`text-center lg:text-left ${className}`}>
      <h1
        id="hero-title"
        className="mx-auto max-w-[14ch] font-serif text-[40px] leading-[1.06] tracking-[-0.02em] text-balance sm:text-[56px] lg:mx-0 lg:max-w-none lg:text-[clamp(36px,13cqw,56px)] lg:leading-[1.04]"
      >
        See every degree of your recovery.
      </h1>
      <p className="mx-auto mt-6 max-w-[34rem] text-lg leading-relaxed text-pretty text-muted md:text-xl md:leading-relaxed lg:mx-0 lg:mt-5 lg:max-w-[30ch] lg:text-lg lg:leading-relaxed">
        Your physiotherapist sets the plan. FiixBE watches every rep through your phone camera and reports back to them.
      </p>
      <div className="mx-auto mt-9 flex max-w-sm flex-col justify-center gap-3 sm:max-w-none sm:flex-row lg:mt-7 lg:flex-wrap lg:justify-start">
        <Button href="/session">Start your recovery</Button>
        <Button href="/for-physios" variant="line">
          For physiotherapists
        </Button>
      </div>
      <p className="mt-5 text-sm text-muted">{site.appsComingSoon}</p>
    </div>
  );
}
