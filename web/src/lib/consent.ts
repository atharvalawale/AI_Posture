/**
 * The visitor's answer to the cookie banner. Analytics cookies stay off until they allow them.
 * Kept in localStorage so the inline Google tag can read it before React loads.
 */
export type Consent = "granted" | "denied";

export const CONSENT_KEY = "fiixbe-analytics-consent";
const CHANGE = "fiixbe:consent-change";
const OPEN_SETTINGS = "fiixbe:cookie-settings";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function readConsent(): Consent | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function saveConsent(value: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Storage is blocked. The choice still applies for this page view.
  }
  window.gtag?.("consent", "update", { analytics_storage: value });
  if (value === "denied") clearAnalyticsCookies();
  window.dispatchEvent(new Event(CHANGE));
}

export function subscribeConsent(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS));
}

export function onOpenCookieSettings(handler: () => void) {
  window.addEventListener(OPEN_SETTINGS, handler);
  return () => window.removeEventListener(OPEN_SETTINGS, handler);
}

/** Withdrawing consent also removes the cookies Google Analytics already set (_ga, _ga_<id>). */
function clearAnalyticsCookies() {
  const host = location.hostname;
  const domains = ["", host, `.${host.replace(/^www\./, "")}`];
  for (const cookie of document.cookie.split("; ")) {
    const name = cookie.split("=")[0];
    if (!name.startsWith("_ga")) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ""}`;
    }
  }
}
