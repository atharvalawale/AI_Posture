import { AngleValue } from "@/components/pose/AngleValue";
import { JOINT_IDS, MEASURES, type JointId, type LiveState } from "@/lib/pose";

type Props = {
  state: LiveState;
  onJoint: (j: JointId) => void;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Place on the track, 0 to 1. For knee and hip deeper means a smaller angle, so the track is flipped and the dot moves toward the goal as you bend. */
function place(v: number, [lo, hi]: [number, number], extreme: "min" | "max") {
  return clamp01(extreme === "min" ? (hi - v) / (hi - lo) : (v - lo) / (hi - lo));
}

function Track({ state, className }: { state: LiveState; className: string }) {
  const m = MEASURES[state.joint];
  const goalAt = place(m.target, m.range, m.extreme) * 100;
  const dotAt = state.value === null ? null : place(state.value, m.range, m.extreme) * 100;
  // A drawn graphic, so assistive tech gets it as one image named by the goal.
  return (
    <div role="img" aria-label={m.goal} className={`relative h-[42px] max-w-[320px] ${className}`}>
      <div className="absolute inset-x-0 top-4 h-0.5 bg-line" />
      <div className="absolute top-2 h-[18px] border-l-2 border-accent" style={{ left: `${goalAt}%` }}>
        <span className="absolute right-[-2px] top-[22px] whitespace-nowrap text-[13px] text-accent">{m.goal}</span>
      </div>
      {dotAt !== null && (
        <div className="absolute top-2.5 -ml-[7px] size-3.5 rounded-full bg-text" style={{ left: `${dotAt}%` }} />
      )}
    </div>
  );
}

/** What a screen reader hears after a scrub, a step or a joint pick: the joint, its angle and the cue. */
function announcement(joint: string, value: number | null, cue: string) {
  return value === null ? cue : `${joint} ${value}°. ${cue}`;
}

/**
 * The live readout beside the hero phone. Its size comes from CSS, so the server and the client agree:
 * compact under the phone below 640 px (the joint's name beside the number, no cue and no joint buttons,
 * since the phone screen shows the cue), full beside it from 640 px.
 */
export function LiveReadout({ state, onJoint }: Props) {
  const m = MEASURES[state.joint];
  const stats: [string, string][] = [
    ["Reps", String(state.reps)],
    [m.extremeLabel, state.extreme === null ? "--" : `${state.extreme}°`],
    ["Form", state.form === null ? "--" : String(state.form)],
  ];

  return (
    <div className="text-text">
      <p className="sr-only text-[15px] text-muted sm:not-sr-only">
        <b data-readout-joint className="font-semibold text-text">
          {m.name}
        </b>{" "}
        {m.sub}
      </p>
      <div className="flex items-baseline gap-3 sm:mt-1.5">
        <div className="font-serif text-[72px] leading-[0.9] tracking-[-0.03em] sm:text-[clamp(110px,12vw,190px)]">
          {/* Faint while there is nothing to measure yet (the clip is loading), so the placeholder never reads as a value. */}
          <AngleValue value={state.value} tabular data-readout-value />
        </div>
        {/* Under the phone the joint's name sits beside the number, so a tap on the hip never leaves a number without its name. */}
        <span aria-hidden="true" className="text-[13px] text-muted sm:hidden">
          {m.name}
        </span>
      </div>
      <Track state={state} className="mt-3 sm:mt-5" />
      <p className="mt-6 hidden min-h-[1.4em] text-[17px] sm:block">{state.cue}</p>
      {/* Speaks only while the visitor drives the clip, never while it loops on its own. */}
      <p aria-live="polite" data-readout-announce className="sr-only">
        {state.driven ? announcement(m.name, state.value, state.cue) : ""}
      </p>
      <dl className="mt-4 grid grid-cols-[repeat(3,auto)] justify-start gap-6 border-t border-line pt-3 sm:mt-8 sm:max-w-[360px] sm:gap-7 sm:pt-[18px]">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="mt-0.5 text-[22px] leading-7 font-medium tabular-nums sm:text-[26px] sm:leading-normal">{value}</dd>
          </div>
        ))}
      </dl>
      <div data-readout-joints className="mt-6 hidden gap-2 sm:flex">
        {JOINT_IDS.map((j) => (
          <button
            key={j}
            type="button"
            aria-pressed={state.joint === j}
            onClick={() => onJoint(j)}
            className="min-h-11 min-w-16 cursor-pointer rounded-lg border border-line px-4 text-[15px] text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-pressed:border-text aria-pressed:text-text"
          >
            {MEASURES[j].name}
          </button>
        ))}
      </div>
    </div>
  );
}
