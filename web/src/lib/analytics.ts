/**
 * Google Analytics events. The tag only loads on the production site (see GoogleAnalytics), so these do
 * nothing locally, in tests and on preview deployments. Consent mode decides what Google may store, so an
 * event never gets around the cookie banner: before "Allow" it goes out as a cookieless ping.
 *
 * Events, and the GA key events they back:
 * - generate_lead (key event): the contact form was sent. `role` is patient, physiotherapist, clinic or other.
 * - sign_up (key event): someone joined the newsletter.
 * - exercise_start: a web session went live with the camera.
 * - exercise_complete (key event): a session reached its report, with reps and scores.
 * - cta_click: a button-styled link was clicked, with its text, target and the page it was on.
 * - story_screen: the homepage phone story reached another screen for the first time on this page view.
 */
type Params = Record<string, string | number | boolean>;

export function track(event: string, params: Params = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", event, params);
}

/** The parameters for a click on a button-styled link. */
export function ctaParams(link: HTMLAnchorElement, pagePath: string): Params {
  return {
    cta_text: (link.textContent ?? "").replace(/\s+/g, " ").trim(),
    link_url: link.getAttribute("href") ?? "",
    page_path: pagePath,
  };
}
