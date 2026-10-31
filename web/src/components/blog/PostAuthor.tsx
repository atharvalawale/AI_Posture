import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";

export function PostAuthor({ reviewedBy }: { reviewedBy: string }) {
  const reviewer = reviewedBy.trim();
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface">
        <LogoMark className="h-[22px] w-auto text-accent" />
      </span>
      <div className="text-[15px] leading-snug">
        <p className="font-medium text-text">FiixBE Clinical Team</p>
        {reviewer && (
          <p className="text-muted">
            Reviewed by{" "}
            {/* The team section on the About page gives the reviewer's role. */}
            <Link href="/about#about-team" className="underline decoration-line underline-offset-4 transition-colors hover:text-text hover:decoration-text">
              {reviewer}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
