/**
 * When the stage pins: motion is allowed and the viewport is tall enough for the pinned stack (the
 * phone at its smallest, the readout, the rail and the hint) to fit under the header. Each height is
 * the shortest viewport, measured in Chrome, where every pinned part fits, across that layout's
 * widths: below 350 px the plan details wrap to one more line, from 640 px the readout sits beside
 * the phone, and from 1024 px the stage is the desktop grid (at least 600 px tall). Measure again
 * when the stage's content changes height.
 * Otherwise nothing pins, and the summary and the plan follow the hero as still sections.
 *
 * globals.css repeats this list in `@custom-variant pin`. pin.test.ts keeps the two the same.
 */
export const PIN_QUERIES = [
  "(prefers-reduced-motion: no-preference) and (max-width: 349.98px) and (min-height: 626px)",
  "(prefers-reduced-motion: no-preference) and (min-width: 350px) and (max-width: 639.98px) and (min-height: 606px)",
  "(prefers-reduced-motion: no-preference) and (min-width: 640px) and (max-width: 1023.98px) and (min-height: 503px)",
  "(prefers-reduced-motion: no-preference) and (min-width: 1024px) and (min-height: 640px)",
] as const;

export const PIN_QUERY = PIN_QUERIES.join(", ");
