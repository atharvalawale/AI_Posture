import type { ScoreBand } from "@/lib/session/protocol";

// Score colors, local to the session page. "good" uses the accent. The camera overlay is always
// dark, so it uses the dark values in both themes.

/** Fills on themed surfaces (light and dark). */
export const bandFill: Record<ScoreBand, string> = {
  good: "bg-accent",
  ok: "bg-[#b7791f] dark:bg-[#e8b04b]",
  low: "bg-[#c2473a] dark:bg-[#f08a7e]",
};

/** Fills on the dark camera overlay. */
export const bandFillOnDark: Record<ScoreBand, string> = {
  good: "bg-[#6fd0c3]",
  ok: "bg-[#e8b04b]",
  low: "bg-[#f08a7e]",
};

export const bandLabel: Record<ScoreBand, string> = {
  good: "80 and above",
  ok: "55 to 79",
  low: "Below 55",
};
