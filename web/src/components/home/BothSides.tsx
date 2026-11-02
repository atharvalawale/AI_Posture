import Link from "next/link";
import { Section, SectionHeading } from "@/components/pages/primitives";
import { Showcase, type ShowcaseItem } from "@/components/showcase/Showcase";
import { PatientPanel } from "./sides/PatientPanel";
import { PhysioPanel } from "./sides/PhysioPanel";

const sides = [
  {
    id: "physios",
    title: "For physiotherapists",
    body: "Follow more patients between visits, with data you have never had from home exercise.",
    points: ["Every patient's sessions in one place", "Automatic session reports", "A library of exercises to prescribe", "Alerts when a session is missed"],
    href: "/for-physios",
    link: "How FiixBE works for physios",
  },
  {
    id: "patients",
    title: "For patients",
    body: "Guided physiotherapy at home, at a fraction of the cost of clinic visits. All you need is your phone.",
    points: ["Live form correction", "Rep counting and a score for every rep", "Spoken cues while you exercise", "Your progress, session by session"],
    href: "/for-patients",
    link: "How FiixBE works for patients",
  },
] as const;

const items: ShowcaseItem[] = sides.map((s) => ({
  id: s.id,
  title: s.title,
  body: s.body,
  detail: (
    <>
      {/*
        The points open on the active card. From 640 to 1023 px the two cards sit side by side, so both show
        their points, the other card's muted. The rows animate open and shut, so a switch on desktop glides
        rather than jumps. The link keeps to the card's foot, so side by side the two links line up.
      */}
      <div className="invisible grid w-full grid-rows-[0fr] transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none in-data-active:visible in-data-active:grid-rows-[1fr] sm:max-lg:visible sm:max-lg:grid-rows-[1fr]">
        <div className="min-h-0 overflow-hidden">
          <ul className="mb-3 grid gap-2 border-t border-line pt-4">
            {s.points.map((p) => (
              <li key={p} className="flex gap-2.5 text-[15px] leading-snug text-muted in-data-active:text-text">
                <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Link
        href={s.href}
        className="mt-auto inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-accent underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {s.link}
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </>
  ),
}));

export function BothSides() {
  return (
    <Section labelledBy="sides-title">
      <SectionHeading id="sides-title" title="Built for both sides of care." />
      <Showcase
        className="mt-14"
        label="Who FiixBE is for"
        items={items}
        panels={[<PhysioPanel key="physios" />, <PatientPanel key="patients" />]}
        layout="cards"
      />
    </Section>
  );
}
