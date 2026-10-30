import { MAYA_SESSION } from "@/lib/sample";

type Chapter = "summary" | "plan";

const NOTES: Record<Chapter, { title: string; line: string }> = {
  summary: {
    title: "Corrects you out loud",
    line: "“Lower slowly.” “Good depth, hold.” Then a score for your form.",
  },
  plan: {
    title: "Keeps your physio close",
    line: "They review each session and adjust your plan.",
  },
};

/**
 * What a chapter of the scroll story is about: a serif title and one line. In the left column on
 * desktop (sized from that column, which is a size container), and above the details below 1024 px.
 */
export function ChapterNote({ screen, className = "", titleId }: { screen: Chapter; className?: string; titleId?: string }) {
  const { title, line } = NOTES[screen];
  return (
    <div className={className}>
      <h2 id={titleId} className="font-serif text-[24px] leading-[1.1] tracking-[-0.015em] text-balance sm:text-[34px] lg:text-[clamp(36px,13cqw,56px)] lg:leading-[1.04] lg:tracking-[-0.02em]">
        {title}
      </h2>
      <p className="mt-1.5 text-[15px] leading-[1.45] text-pretty text-muted sm:mt-3 sm:text-[17px] lg:mt-5 lg:max-w-[30ch] lg:text-lg lg:leading-relaxed">
        {line}
      </p>
    </div>
  );
}

type Line = { label: string; value: string };

// What the summary and plan screens show, in words. Sample data, so it mirrors the phone exactly.
const SUMMARY: Line[] = [
  { label: "Form score", value: `${MAYA_SESSION.formScore}, up ${MAYA_SESSION.change} from yesterday` },
  { label: "Deepest knee bend", value: `${MAYA_SESSION.deepest}°` },
  { label: "Report", value: "Sent to your physio" },
];

const PLAN: Line[] = [
  { label: "This week", value: "Week 3 of the knee plan" },
  { label: "Added", value: "Split squats" },
  { label: "Physio's note", value: "“Go slow on the way down.”" },
];

/**
 * Three short lines about the screen on the phone. `full`: a label over each value, for the column
 * beside the phone. `compact`: one line each, label left and value right, for under the phone.
 */
function Details({ id, lines, variant }: { id: Chapter; lines: Line[]; variant: "full" | "compact" }) {
  if (variant === "compact") {
    return (
      <dl data-chapter-details={id} className="border-t border-line text-[15px]">
        {lines.map(({ label, value }) => (
          <div key={label} className="flex items-baseline justify-between gap-4 border-b border-line py-1.5">
            <dt className="shrink-0 text-muted">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl data-chapter-details={id} className="border-t border-line">
      {lines.map(({ label, value }) => (
        <div key={label} className="border-b border-line py-4">
          <dt className="text-[13px] text-muted">{label}</dt>
          <dd className="mt-1 text-[22px] leading-snug font-medium text-pretty">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SummaryDetails({ variant }: { variant: "full" | "compact" }) {
  return <Details id="summary" lines={SUMMARY} variant={variant} />;
}

export function PlanDetails({ variant }: { variant: "full" | "compact" }) {
  return <Details id="plan" lines={PLAN} variant={variant} />;
}
