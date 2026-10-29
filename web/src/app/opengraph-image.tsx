import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = "FiixBE - See every degree of your recovery.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same mark as src/components/brand/Logo.tsx.
const MARK =
  "M17480 16554 c-2941 -879 -5219 -3278 -5924 -6238 l-43 -179 -95 134 c-982 1381 -2535 2432 -4395 2974 -176 51 -157 102 -167 -453 l-7 -387 142 -54 c1296 -487 2474 -1347 3226 -2355 537 -718 855 -1492 960 -2336 28 -231 25 -786 -5 -1015 -132 -975 -523 -1783 -1245 -2574 -764 -837 -1964 -1545 -3202 -1886 -55 -16 -103 -31 -107 -34 -8 -7 -53 -1849 -45 -1857 18 -18 774 228 1094 355 1966 782 3452 2072 4237 3676 57 116 123 257 146 315 24 58 46 108 50 112 3 4 30 -43 60 -104 920 -1890 2493 -3353 4430 -4123 208 -83 638 -231 646 -222 7 7 26 738 22 835 -3 73 -3 73 -183 149 -1945 825 -3485 2517 -4114 4521 -139 443 -216 807 -286 1352 -98 757 -29 1767 176 2585 568 2262 2314 4167 4519 4929 l205 71 16 725 c9 399 19 814 22 923 4 148 3 197 -6 196 -7 0 -64 -16 -127 -35z M10251 16409 c-695 -67 -1270 -547 -1465 -1222 -84 -289 -84 -625 0 -914 255 -885 1148 -1400 2039 -1176 936 234 1484 1224 1188 2148 -240 750 -980 1240 -1762 1164z";

export default async function OpengraphImage() {
  const dir = join(process.cwd(), "src/app/_og");
  const [serif, sans] = await Promise.all([
    readFile(join(dir, "Brygada1918-Regular.ttf")),
    readFile(join(dir, "InstrumentSans-Medium.ttf")),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: "#0b0f10", color: "#eef2f1" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="40" height="59" viewBox="0 0 1104.34 1629.66">
            <g transform="translate(-657.2 1658.94) scale(0.1 -0.1)" fill="#6fd0c3">
              <path d={MARK} />
            </g>
          </svg>
          <div style={{ fontFamily: "Instrument Sans", fontSize: 40 }}>{site.name}</div>
        </div>
        <div style={{ fontFamily: "Brygada 1918", fontSize: 92, lineHeight: 1.02, letterSpacing: "-0.02em", maxWidth: 900 }}>
          See every degree of your recovery.
        </div>
        <div style={{ fontFamily: "Instrument Sans", fontSize: 28, color: "#8d9b99" }}>
          Plans from licensed physiotherapists. Every rep checked at home.
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Brygada 1918", data: serif, weight: 400, style: "normal" },
        { name: "Instrument Sans", data: sans, weight: 500, style: "normal" },
      ],
    },
  );
}
