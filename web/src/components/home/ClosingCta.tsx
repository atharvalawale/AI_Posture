import Link from "next/link";
import { ClosingCta as Closing } from "@/components/pages/primitives";
import { Button } from "@/components/ui/Button";
import { site } from "@/lib/site";

export function ClosingCta() {
  return (
    <Closing
      id="closing-title"
      title="Try your first session today."
      body="FiixBE runs in your browser. Nothing to install. Just allow camera access."
      actions={
        <>
          <Button href="/session">Try it on the web</Button>
          <Button href="/contact" variant="line">
            Bring FiixBE to your clinic
          </Button>
        </>
      }
      note={
        <>
          {site.appsComingSoon} Physiotherapy clinics in {site.location.replace(", India", "")} can{" "}
          <Link href="/pricing" className="underline decoration-line underline-offset-4 hover:decoration-current">
            join as founding partners
          </Link>
          .
        </>
      }
    />
  );
}
