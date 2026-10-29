# FiixBE website: Next.js rebuild in direction B2

Status: approved by Parth to build. Date: 2026-10-29.

## Intent

FiixBE is an AI-assisted physiotherapy product for India. A licensed physiotherapist writes the plan. The patient does the exercises at home in front of a phone camera. The AI counts reps, measures joint angles, corrects form, and sends each session to the physio.

The current site in `website/` is static HTML, CSS, and vanilla JavaScript. It looks generic and uses emojis. This project rebuilds it in Next.js with a new visual identity.

A first-time visitor must feel two things in the first five seconds:

1. Trust: "this is where I get the care I deserve, from real physiotherapists."
2. Awe: "this technology is real and it is impressive."

FiixBE is also a mobile app. The site must show the app clearly, on desktop and on phones.

## Goals

- Rebuild the site in Next.js with direction B2 ("the app is the hero").
- Show a 3D phone that plays a real exercise clip with real pose tracking on its screen.
- Use scroll-based animation to tell the product story through the phone.
- Support dark mode and light mode. Both must look clean and finished.
- Keep the live exercise session page working against the existing backend.
- Remove every emoji from the site.

## Non-goals

- No changes to the Python backend (`pose_backend/`, `ai_engine/`).
- No user accounts, dashboards, or physio portal in this project.
- No CMS. Blog posts stay in the repo as files.
- No font switcher or theme picker beyond a light/dark toggle.

## Anti-goals

The site fails if it looks AI-generated, even when everything works. Never use these:

- Blinking "live" or status pills above a title.
- Uppercase, letter-spaced labels or subheadings. All text is sentence case.
- Gradients of any kind: text, buttons, or backgrounds.
- Glow effects, neon outlines, HUD frames, corner brackets, or scan lines.
- Overused fonts: Inter, Geist, Sora, Space Grotesk, Instrument Serif.
- Emojis.

Prefer fewer elements. Every element must earn its place.

## Decisions Parth made

- Direction B2 is the base. Reference mockup: `.superpowers/brainstorm/56173-1793266872/content/b-variations.html`, section "B2. The app is the hero", and the "FiixBE app" screens below it.
- The phone is a real 3D asset, animated, with scroll-based animation.
- The site has a light mode in addition to dark mode.
- Fonts: Brygada 1918 for headlines and Instrument Sans for all other text (Parth chose these on 2026-10-29). Font names live in one file only.
- Stock photos and video come from free sources only (Unsplash License, Pexels License). Never use Unsplash+ images.
- The 3D phone is for the landing page only. The real exercise session (the session page) does not use it.
- The mobile apps are not live. The web session page is the product today. Every "get the app" moment says the apps are coming soon and sends the visitor to try FiixBE on the web.
- Build every page now, not the homepage first.
- Deploy on Vercel in a project called `fiixbee` under Parth's account. Create the project if it does not exist. The domain is `fiixbee.com`.
- The contact email is `hello@fiixbee.com`. The site never mentions "PhysioAI".
- The contact form sends real messages to the `hello@fiixbee.com` mailbox.
- The blog ships with real, researched articles on the topics of the current blog. Subagents research and write them.
- Use photo avatars where people appear, if suitable free photos exist.

## Visual system

### Color tokens

Define all colors as CSS custom properties. Components use tokens only, never raw hex values.

| Token | Dark | Light |
|---|---|---|
| `--bg` | `#0B0F10` | `#F6F6F3` |
| `--surface` | `#131A1C` | `#FFFFFF` |
| `--surface-2` | `#1A2326` | `#EFF1EE` |
| `--line` | `#243033` | `#E1E4E0` |
| `--text` | `#EEF2F1` | `#101617` |
| `--muted` | `#8D9B99` | `#5C6866` |
| `--accent` | `#6FD0C3` | `#0F6E7C` |
| `--on-accent` | `#06231F` | `#FFFFFF` |

The skeleton overlay on video uses fixed colors in both themes: line `#5ED6C6` over a 45% dark outline, joints white with a `#0B5E57` ring. The video background decides legibility, not the page theme.

### Theme behavior

- On first visit, the theme follows `prefers-color-scheme`.
- A toggle in the navigation switches between light and dark. The site stores the choice in `localStorage`.
- The site sets the theme before first paint, so the page never flashes the wrong theme.

### Typography

- Headlines: the chosen serif, weight 400, tight leading (about 1.02), slight negative tracking.
- Everything else: the chosen grotesque, including buttons, navigation, and app screens.
- Load fonts with `next/font/google` so the site self-hosts them.

### Logo

The mark and the "FiixBE" wordmark come from `website/assets/fixbe_jpg.jpeg`. Trace the mark into a clean SVG. The mockups use a rough approximation that must not ship.

## Homepage structure

1. **Navigation.** Logo, links (How it works, For patients, For physios, Pricing, Blog), theme toggle, and one button: "Try it on the web" (opens the session page). There is no "Sign in", because the site has no accounts (Claude's call). About and Contact go in the footer.
2. **Hero.** Centered serif headline "See every degree of your recovery.", one lead sentence, two buttons: "Start your recovery" (opens the session page) and "For physiotherapists" (opens the for-physios page). Below the buttons, one quiet line: "iPhone and Android apps coming soon."
3. **3D phone stage.** The phone sits below the hero copy. Four short notes surround it: "Counts every rep", "Measures your joints", "Corrects you out loud", "Keeps your physio close".
4. **Scroll story.** The phone pins in place while the visitor scrolls. The screen moves through three app screens: live session, session summary, today's plan. The side notes change with each screen.
5. **Content sections.** Port the content of the current homepage: the problem, how it works (prescribe, practice, review), the patient and physio sides, and the closing call to action. Restyle it in the B2 system.
6. **Footer.**

## The 3D phone

- Build the phone as a procedural model in React Three Fiber: rounded body, screen glass, side buttons, camera bump. Do not use a downloaded iPhone model. This avoids license problems and Apple trade dress.
- The screen is a canvas texture. Each frame, draw the video frame, the skeleton, and the app UI into a 2D canvas, then upload it as the texture.
- Scroll drives the phone's rotation and position, and the screen content. Start tilted, rotate to face the visitor, then pin for the scroll story.
- Load the 3D code after first paint. The hero text must render without it.
- Phones and tablets also get the 3D phone when the device passes a capability check (Claude's call). The check: WebGL2 is available, `navigator.deviceMemory` is 4 GB or more when the browser reports it, and `navigator.hardwareConcurrency` is 4 or more.
- Fallback: when a device fails the check, show the 2D phone from the mockup with the same video, skeleton, and scroll story. Build the 2D path as a full experience, because many low-end Android visitors in India will see it.
- Performance budget on a mid-range Android phone: Largest Contentful Paint under 2.5 seconds, and the 3D bundle under 250 KB gzipped (Claude's call).
- Reduced motion: when `prefers-reduced-motion` is on, show the phone face-on with no scroll animation. The video still plays.

## Pose clip pipeline

The skeleton on the phone is real MediaPipe output, not an illustration.

- Source clip: Pexels video 7117089, "Daytime workout of a woman" (free license). Self-host it in `public/media/`, encoded at 720p, under 3 MB.
- A script in the repo runs the MediaPipe pose landmarker (heavy model) over the clip and writes keypoints to JSON. The prototype is in `.superpowers/prototype/` (`extract_pose.py`, plus `pose_compact.json`, the current output). It moves into the repo as `scripts/pose/extract_pose.py`.
- The prototype writes all 33 landmarks as floats. A second step reduces them to 15 landmarks per frame at 15 samples per second, as integers in thousandths. The repo script does both steps. The current output is about 53 KB.
- The client interpolates between samples and uses `requestVideoFrameCallback` so the skeleton matches the frame on screen.
- The client computes the knee angle, rep count, and spoken-cue text from the keypoints. The thresholds from the mockup are: rep starts below 115 degrees, rep ends above 160 degrees.

## Other pages

Port every page in `website/` to the new system: about, blog, contact, for patients, for physios, pricing, session. Keep the current content as the starting point, remove emojis, and rewrite copy only where it breaks the anti-goals.

The session page (`website/session.html`) is a working product feature:

- It asks for camera access, shows an alignment step, then streams frames over a WebSocket to `wss://ai-posture-backend.onrender.com/ws/pose/{exercise}/{side}?reps_target={n}`.
- It shows live feedback, rep dots, and a report at the end.
- Port it as a client component with the same behavior and the same backend protocol. Restyle it with the B2 system and the app-screen designs from the mockup.
- Read the backend URL from the environment variable `NEXT_PUBLIC_POSE_WS_URL`. Do not hard-code it.
- The session page does not use the 3D phone.

## Technology

- Next.js App Router with TypeScript, in a new `web/` folder. `website/` and `frontend/` stay until the new site goes live, then the team deletes them.
- Styling: Tailwind CSS v4 with the color tokens as CSS variables.
- 3D: three.js with React Three Fiber and drei.
- Scroll animation: GSAP ScrollTrigger.
- Images: self-host the chosen Unsplash and Pexels files and serve them through `next/image`. Keep a `CREDITS.md` with the source URL of each file.

## Content rules

- Brand name: the logo says "FiixBE". The current pages also use "Fixbee" and "PhysioAI". The new site uses one name everywhere.
- The mockups use invented physio names, cities, and numbers. Do not ship invented people or invented statistics in marketing copy. Use real ones, or use copy without names.
- Inside the app screens of the scroll story, sample data is allowed because it shows what the app displays (Claude's call). Examples: a patient called "Riya", a form score of 92, and a photo avatar for "Your physio".
- Keep statistics from the current site only where they have a source.
- Brand name: "FiixBE" everywhere in copy, as on the logo. The domain stays `fiixbee.com` (Claude's call).
- Blog: MDX files in the repo, one per article, with sources listed at the end and a medical disclaimer. Each article has a `reviewedBy` field. The article page shows the reviewer when the field is set (Claude's call). Authors show as "FiixBE Clinical Team" with the FiixBE mark as avatar, not an invented person.

## Contact form and newsletter

- The contact form posts to a Next.js route handler. The handler sends the message to `hello@fiixbee.com` through Resend, with the visitor's address as reply-to (Claude's call).
- Validate input on the server. Add a honeypot field and a simple rate limit against spam.
- The blog newsletter form adds the address to a Resend audience.
- Secrets live in Vercel environment variables: `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, and the sender address. Resend must verify `fiixbee.com` as a sending domain through DNS records. Parth adds these records at the domain registrar.

## Left to the builder

- Component structure, file layout inside `web/`, and naming.
- Exact scroll distances, easing, and timing of the scroll story.
- The procedural phone's exact geometry and materials, within "clean, neutral, not an iPhone copy".
- Test setup, linting, and formatting tools.

## Redirects

Old URLs keep working. `next.config` redirects each `*.html` path to its new route, for example `/for-physios.html` to `/for-physios` (Claude's call).

## Still open

- City: the current pages say Pune and Mumbai. The footer uses "Pune and Mumbai, India" until Parth says otherwise.
- Final font pair (Parth decides from the font links).
