import Link from "next/link";
import { Section, SectionHeading, bodyClass } from "@/components/pages/primitives";

const sides = [
  {
    id: "side-physios",
    title: "For physiotherapists",
    body: "Follow more patients between visits, with data you have never had from home exercise.",
    points: ["Every patient's sessions in one place", "Automatic session reports", "A library of exercises to prescribe", "Alerts when a session is missed"],
    href: "/for-physios",
    link: "How FiixBE works for physios",
  },
  {
    id: "side-patients",
    title: "For patients",
    body: "Guided physiotherapy at home, at a fraction of the cost of clinic visits. All you need is your phone.",
    points: ["Live form correction", "Rep counting and a score for every rep", "Spoken cues while you exercise", "Your progress, session by session"],
    href: "/for-patients",
    link: "How FiixBE works for patients",
  },
] as const;

export function BothSides() {
  return (
    <Section labelledBy="sides-title">
      <SectionHeading id="sides-title" title="Built for both sides of care." />
      <div className="mt-14 grid gap-x-16 gap-y-14 md:grid-cols-2">
        {sides.map((s) => (
          <div key={s.id} className="border-t border-line pt-7">
            <h3 id={s.id} className="font-serif text-[28px] leading-[1.15] tracking-[-0.015em]">
              {s.title}
            </h3>
            <p className={`mt-3 max-w-md ${bodyClass}`}>{s.body}</p>
            <ul className="mt-6 border-t border-line">
              {s.points.map((p) => (
                <li key={p} className="border-b border-line py-3.5 text-base leading-snug">
                  {p}
                </li>
              ))}
            </ul>
            <Link href={s.href} aria-describedby={s.id} className="mt-6 inline-flex items-center gap-2 text-[15px] font-medium text-accent underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current">
              {s.link}
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        ))}
      </div>
    </Section>
  );
}
