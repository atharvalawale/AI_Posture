// The only place fonts are chosen. Swap the pair here to change the whole site.
import { Brygada_1918, Instrument_Sans } from "next/font/google";

const serif = Brygada_1918({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--ff-serif",
  display: "swap",
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--ff-sans",
  display: "swap",
});

export const fonts = { serif, sans };
