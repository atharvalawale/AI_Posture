import type { CSSProperties, ReactNode } from "react";

/** Design size of the phone. Screens are laid out for SCREEN_W x SCREEN_H CSS pixels. */
export const PHONE_W = 300;
export const PHONE_H = 630;
export const BEZEL = 10;
export const SCREEN_W = PHONE_W - BEZEL * 2;
export const SCREEN_H = PHONE_H - BEZEL * 2;
export const SCREEN_RADIUS = 38;

export type ScreenId = "live" | "summary" | "plan";

/**
 * The glass: rounded screen with a punch-hole camera, sized SCREEN_W x SCREEN_H.
 * Shared by the 2D frame and the 3D model so both show exactly the same pixels.
 * `data-phone-screen` marks app UI drawn at real-phone scale: its text may sit below the
 * page's 13 px floor, and it never carries anything that is not also said on the page.
 */
export function ScreenSurface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-phone-screen=""
      className={`relative overflow-hidden bg-bg font-sans text-text ${className}`}
      style={{ width: SCREEN_W, height: SCREEN_H, borderRadius: SCREEN_RADIUS }}
    >
      {children}
      <div aria-hidden="true" className="absolute left-1/2 top-[13px] z-20 h-[13px] w-[13px] -translate-x-1/2 rounded-full bg-black" />
    </div>
  );
}

/**
 * The 2D device: black body, 10px bezel, 48px outer radius, punch-hole camera.
 * Laid out at 300 x 630 and scaled to `width` (height = width x 2.1). With `width="fluid"` it takes its
 * parent's width and scales in CSS (a size container, and `tan(atan2())` to turn its width into a plain
 * number), so the server renders it at its final size before any script has measured it.
 */
export function PhoneFrame({
  width = PHONE_W,
  children,
  className = "",
  style,
}: {
  width?: number | "fluid";
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const fluid = width === "fluid";
  const box: CSSProperties = fluid ? { aspectRatio: `${PHONE_W} / ${PHONE_H}` } : { width, height: width * (PHONE_H / PHONE_W) };
  const scale = fluid ? `scale(tan(atan2(100cqw, ${PHONE_W}px)))` : width === PHONE_W ? undefined : `scale(${width / PHONE_W})`;
  return (
    <div className={`relative shrink-0 ${fluid ? "@container w-full" : ""} ${className}`} style={{ ...box, ...style }}>
      <div
        className="absolute left-0 top-0 rounded-[48px] bg-device shadow-[0_0_0_1px_var(--device-edge),0_40px_70px_-36px_rgba(0,0,0,.55)]"
        style={{ width: PHONE_W, height: PHONE_H, padding: BEZEL, transform: scale, transformOrigin: "0 0" }}
      >
        <ScreenSurface>{children}</ScreenSurface>
      </div>
    </div>
  );
}
