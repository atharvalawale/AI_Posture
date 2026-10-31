import Script from "next/script";
import { CONSENT_KEY } from "@/lib/consent";
import { site } from "@/lib/site";

/**
 * Google Analytics 4 with consent mode v2. The consent default must run before `config`, so it lives in the
 * same inline script. Analytics storage is denied until the visitor allows it in the cookie banner, and FiixBE
 * runs no ads, so the ad signals stay denied. Page views on client navigations come from GA4's enhanced
 * measurement, which listens to browser history changes.
 */
const init = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
var consent;try{consent=localStorage.getItem(${JSON.stringify(CONSENT_KEY)});}catch(e){}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:consent==='granted'?'granted':'denied'});
gtag('js',new Date());gtag('config',${JSON.stringify(site.analyticsId)});`;

export function GoogleAnalytics() {
  // Only the production site reports, so local runs, tests and preview deployments stay out of the numbers.
  if (process.env.VERCEL_ENV !== "production") return null;
  return (
    <>
      <Script id="google-analytics" strategy="afterInteractive">
        {init}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${site.analyticsId}`} strategy="afterInteractive" />
    </>
  );
}
