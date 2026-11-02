import { shareImage } from "@/lib/seo";
import { shareCard } from "./_og/card";

export { size } from "./_og/card";
export const alt = shareImage.alt;
export const contentType = "image/png";

export default function OpengraphImage() {
  return shareCard({
    headline: "See every degree of your recovery.",
    footnote: ["Plans from licensed physiotherapists. Every rep checked at home."],
  });
}
