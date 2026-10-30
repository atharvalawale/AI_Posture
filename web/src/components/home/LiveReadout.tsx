import { JOINT_IDS, MEASURES, type JointId, type LiveState } from "@/lib/pose";

type Props = {
  state: LiveState;
  onJoint: (j: JointId) => void;
  variant: "full" | "compact";
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Place on the track, 0 to 1. For knee and hip deeper means a smaller angle, so the track is flipped and the dot moves toward the goal as you bend. */
function place(v: number, [lo, hi]: [number, number], extreme: "min" | "max") {
  return clamp01(extreme === "min" ? (hi - v) / (hi - lo) : (v - lo) / (hi - lo));
}

function Track({ state }: { state: LiveState }) {
  const m = MEASURES[state.joint];
  const goalAt = place(m.target, m.range, m.extreme) * 100;
  const dotAt = state.value === null ? null : place(state.value, m.range, m.extreme) * 100;
  return (
    <div className="relative mt-5 h-[42px] max-w-[320px]" aria-hidden="true">
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

export function LiveReadout({ state, onJoint, variant }: Props) {
  const m = MEASURES[state.joint];
  const full = variant === "full";
  const stats: [string, string][] = [
    ["Reps", String(state.reps)],
    [m.extremeLabel, state.extreme === null ? "-" : `${state.extreme}°`],
    ["Form", state.form === null ? "-" : String(state.form)],
  ];

  return (
    <div className="text-text">
      {full && (
        <p className="text-[15px] text-muted">
          <b data-readout-joint className="font-semibold text-text">{m.name}</b> {m.sub}
        </p>
      )}
      {!full && <span data-readout-joint className="sr-only">{m.name}</span>}
      <div
        className="font-serif leading-[0.9] tabular-nums tracking-[-0.03em]"
        style={{ fontSize: full ? "clamp(110px, 12vw, 190px)" : "72px", marginTop: full ? 6 : 0 }}
      >
        <span data-readout-value>{state.value === null ? "--" : state.value}</span>
        <span className="ml-1 align-top font-sans text-[0.4em] text-muted" style={{ position: "relative", top: "0.2em" }}>°</span>
      </div>
      <Track state={state} />
      <p aria-live="polite" className={`${full ? "mt-6 text-[17px]" : "mt-5 text-[15px]"} min-h-[1.4em]`}>
        {state.cue}
      </p>
      <dl
        className={`${full ? "mt-8 max-w-[360px] gap-7 pt-[18px]" : "mt-5 gap-6 pt-3.5"} grid grid-cols-[repeat(3,auto)] justify-start border-t border-line`}
      >
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className={`${full ? "text-[26px]" : "text-[22px]"} mt-0.5 font-medium tabular-nums`}>{value}</dd>
          </div>
        ))}
      </dl>
      {full && (
        <div className="mt-6 flex gap-2">
          {JOINT_IDS.map((j) => (
            <button
              key={j}
              type="button"
              aria-pressed={state.joint === j}
              onClick={() => onJoint(j)}
              className="min-h-11 min-w-16 cursor-pointer rounded-lg border border-line px-4 text-[15px] text-muted transition-colors hover:text-text aria-pressed:border-text aria-pressed:text-text"
            >
              {MEASURES[j].name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
