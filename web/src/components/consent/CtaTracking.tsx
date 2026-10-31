"use client";

import { useEffect } from "react";
import { ctaParams, track } from "@/lib/analytics";

/** Reports clicks on button-styled links (Button with an href marks them `data-cta`) as `cta_click`. */
export function CtaTracking() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[data-cta]");
      if (link instanceof HTMLAnchorElement) track("cta_click", ctaParams(link, window.location.pathname));
    };
    // Capture, so the click is seen before a client navigation replaces the page.
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
