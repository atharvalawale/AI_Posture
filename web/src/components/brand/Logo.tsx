import Link from "next/link";
import { site } from "@/lib/site";

// Traced with potrace from website/assets/fixbe_jpg.jpeg.
const MARK_BODY =
  "M17480 16554 c-2941 -879 -5219 -3278 -5924 -6238 l-43 -179 -95 134 c-982 1381 -2535 2432 -4395 2974 -176 51 -157 102 -167 -453 l-7 -387 142 -54 c1296 -487 2474 -1347 3226 -2355 537 -718 855 -1492 960 -2336 28 -231 25 -786 -5 -1015 -132 -975 -523 -1783 -1245 -2574 -764 -837 -1964 -1545 -3202 -1886 -55 -16 -103 -31 -107 -34 -8 -7 -53 -1849 -45 -1857 18 -18 774 228 1094 355 1966 782 3452 2072 4237 3676 57 116 123 257 146 315 24 58 46 108 50 112 3 4 30 -43 60 -104 920 -1890 2493 -3353 4430 -4123 208 -83 638 -231 646 -222 7 7 26 738 22 835 -3 73 -3 73 -183 149 -1945 825 -3485 2517 -4114 4521 -139 443 -216 807 -286 1352 -98 757 -29 1767 176 2585 568 2262 2314 4167 4519 4929 l205 71 16 725 c9 399 19 814 22 923 4 148 3 197 -6 196 -7 0 -64 -16 -127 -35z";
const MARK_HEAD =
  "M10251 16409 c-695 -67 -1270 -547 -1465 -1222 -84 -289 -84 -625 0 -914 255 -885 1148 -1400 2039 -1176 936 234 1484 1224 1188 2148 -240 750 -980 1240 -1762 1164z";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1104.34 1629.66" className={className} aria-hidden="true" fill="currentColor">
      <g transform="translate(-657.2 1658.94) scale(0.1 -0.1)">
        <path d={MARK_BODY} />
        <path d={MARK_HEAD} />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex min-h-11 items-center gap-2 text-text ${className ?? ""}`} aria-label={`${site.name} home`}>
      <LogoMark className="h-7 w-auto text-accent" />
      <span className="font-sans text-[19px] font-semibold tracking-[-0.01em]">{site.name}</span>
    </Link>
  );
}
