import type { HTMLAttributes } from "react";

type Props = { value: number | null } & HTMLAttributes<HTMLSpanElement> & { [data: `data-${string}`]: unknown };

/**
 * A large angle in degrees: the number in the parent's (serif) font with proportional figures, so the digits
 * sit together, and a small sans "°" whose top lines up with the cap height of the figures.
 * Faint "--" while there is no value, so the placeholder never reads as a number.
 * Size and font come from the parent.
 */
export function AngleValue({ value, className = "", ...numberProps }: Props) {
  return (
    <>
      <span {...numberProps} className={`proportional-nums ${value === null ? "text-line" : ""} ${className}`}>
        {value === null ? "--" : value}
      </span>
      <span
        className={`font-sans text-[0.32em] text-muted ${value === null ? "invisible" : ""}`}
        // In the sign's own em (0.32 of the number's): lifts the top of "°" to the serif cap line.
        style={{ verticalAlign: "1.35em", marginLeft: "0.04em" }}
      >
        °
      </span>
    </>
  );
}
