import { useId } from "react";

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
};

export function TargetSlider({ value, onChange, min = 85, max = 130, label }: Props) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[15px] text-muted">
          {label}
        </label>
        <span className="font-serif text-2xl tabular-nums text-text">{value}°</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-valuetext={`${value}°`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 block h-11 w-full cursor-pointer accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
    </div>
  );
}
