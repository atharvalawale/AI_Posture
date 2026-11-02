"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { onOpenCookieSettings, openCookieSettings, readConsent, saveConsent, subscribeConsent, type Consent } from "@/lib/consent";

/** "server" while prerendering, so the banner never flashes in before the stored choice is read. */
const serverSnapshot = () => "server" as const;

export function CookieBanner() {
  const consent = useSyncExternalStore(subscribeConsent, readConsent, serverSnapshot);
  const [reopened, setReopened] = useState(false);
  useEffect(() => onOpenCookieSettings(() => setReopened(true)), []);

  if (consent === "server" || (consent !== null && !reopened)) return null;

  function choose(value: Consent) {
    saveConsent(value);
    setReopened(false);
  }

  return (
    <section
      aria-label="Cookies"
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] rounded-[14px] border border-line bg-surface p-5 shadow-[0_16px_40px_-24px_rgb(0_0_0/0.45)] sm:left-6 sm:right-auto sm:bottom-6 sm:max-w-[400px]"
    >
      <p className="text-[15px] leading-relaxed text-text">
        Can we use Google Analytics cookies to learn which pages help people? They stay off unless you allow them.
      </p>
      {consent && <p className="mt-2 text-sm text-muted">{consent === "granted" ? "You allowed them." : "You declined them."}</p>}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button size="sm" onClick={() => choose("granted")}>
          Allow
        </Button>
        <Button size="sm" variant="line" onClick={() => choose("denied")}>
          Decline
        </Button>
      </div>
    </section>
  );
}

/** Reopens the banner so a visitor can change their answer. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openCookieSettings} className={className}>
      Cookie settings
    </button>
  );
}
