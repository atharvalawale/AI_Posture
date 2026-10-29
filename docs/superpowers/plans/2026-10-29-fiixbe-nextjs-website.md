# FiixBE Next.js Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the FiixBE marketing site and web session in Next.js in direction B2, with a scroll-driven 3D phone on the landing page.

**Architecture:** One Next.js App Router app in `web/`. Shared design tokens and layout come first. A pure TypeScript pose library drives every skeleton on the site. Phone screens are plain DOM components, reused by the 3D stage (drei `<Html transform>`) and the 2D fallback. Pages are server components. The session page is one client component tree that talks to the existing Python backend over WebSocket.

**Tech Stack:** Next.js 16.4 (App Router, `cacheComponents` on), React 19.3, TypeScript, Tailwind CSS v4, next-themes, three + @react-three/fiber + @react-three/drei, gsap + @gsap/react (ScrollTrigger), resend, zod, gray-matter + unified (remark-parse, remark-gfm, remark-rehype, rehype-slug, rehype-stringify), Vitest + Testing Library + jsdom, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-fiixbe-nextjs-website-design.md`

## Global Constraints

- Next.js 16 differs from older versions. Before writing code that uses a Next.js API, read its guide in `web/node_modules/next/dist/docs/`. Heed deprecation notices.
- All app code lives in `web/`. Do not modify `website/`, `frontend/`, `pose_backend/`, or `ai_engine/`.
- Copy: brand name "FiixBE" only. Never "PhysioAI" or "Fixbee". Email `hello@fiixbee.com`. Domain `fiixbee.com`.
- Copy: no emojis, no em dash character (use "-" or two sentences), sentence case everywhere.
- Styling bans: no `text-transform: uppercase`, no letter-spaced labels, no gradients (`linear-gradient`, `radial-gradient`, `bg-gradient-*`), no glow (`box-shadow` with colored blur, `drop-shadow` glow, `text-shadow`), no status pills above titles.
- Font bans: Inter, Geist, Sora, Space Grotesk, Instrument Serif. Remove the scaffold's Geist imports.
- Fonts: Brygada 1918 (headlines, weight 400) and Instrument Sans (all other text), loaded in `web/src/app/fonts.ts` only.
- Colors: components use tokens only (`--bg`, `--surface`, `--surface-2`, `--line`, `--text`, `--muted`, `--accent`, `--on-accent`), with the dark and light values from the spec table.
- Skeleton on video: line `#5ED6C6` over a `rgba(6,20,22,.45)` outline 2.5px wider, joints white with a 1.5px `#0B5E57` ring, in both themes.
- Images: free Unsplash License or Pexels License only. Never `plus.unsplash.com`. Self-host in `web/public/images/`. Record each file in `web/credits/<area>.md` (source page URL, photographer, license).
- The 3D phone appears on the homepage only.
- Calls to action: "Try it on the web" and "Start your recovery" go to `/session`. "For physiotherapists" goes to `/for-physios`. Any mention of the mobile apps says "iPhone and Android apps coming soon."
- Commits: the repo lives on an exFAT drive. Never commit `._*` files (`.gitignore` covers them). Commit only when Parth has asked for commits.

## Review Focus

1. Camera permission denied or no camera on `/session`: the visitor sees a clear message and a retry button, and nothing crashes. Test in Task 9.
2. Backend asleep (Render free tier, about 30 s cold start): the session shows "Waking up the AI, attempt n of 5", retries with 3 s, 6 s, 9 s, 12 s, 15 s delays, then shows a final error. Test in Task 9.
3. Landing video blocked or slow (iOS Low Power Mode blocks autoplay): the poster image shows, and no skeleton draws until the video plays. Test in Task 3.
4. Stored theme differs from the system theme: the page paints the stored theme first, with no flash. Test in Task 1.
5. Mail provider missing or failing: the contact form shows an error that names `hello@fiixbee.com`, never a fake success. Test in Task 7.

---

### Task 1: Foundation (deps, tokens, fonts, theme, layout, redirects, test harness)

**Files:**
- Modify: `web/package.json`, `web/next.config.ts`, `web/src/app/layout.tsx`, `web/src/app/globals.css`, `web/src/app/page.tsx` (placeholder), `web/eslint.config.mjs`
- Create: `web/src/app/fonts.ts`, `web/src/components/theme/ThemeProvider.tsx`, `web/src/components/theme/ThemeToggle.tsx`, `web/src/components/brand/Logo.tsx`, `web/src/components/layout/SiteHeader.tsx`, `web/src/components/layout/SiteFooter.tsx`, `web/src/components/ui/Button.tsx`, `web/src/components/ui/Container.tsx`, `web/src/lib/site.ts`, `web/vitest.config.ts`, `web/vitest.setup.ts`, `web/playwright.config.ts`, `web/e2e/foundation.spec.ts`, `web/src/lib/site.test.ts`, `web/credits/README.md`

**Interfaces:**
- Produces: `site` in `@/lib/site`: `{ name: "FiixBE", email: "hello@fiixbee.com", domain: "fiixbee.com", location: "Pune and Mumbai, India", nav: { href: string; label: string }[], appsComingSoon: "iPhone and Android apps coming soon." }`.
- Produces: `<Button href? variant="solid" | "line" size="md" | "sm">`, `<Container>` (max-width 1200px, 24px side padding, 40px from 1024px up), `<SiteHeader />`, `<SiteFooter />`, `<Logo className? />`, `<ThemeToggle />`.
- Produces: `fonts.serif` and `fonts.sans` from `@/app/fonts` with CSS variables `--font-serif` and `--font-sans`. Tailwind theme exposes `font-serif` and `font-sans`, and colors `bg`, `surface`, `surface-2`, `line`, `text`, `muted`, `accent`, `on-accent`.
- Produces: npm scripts `test` (vitest run), `test:e2e` (playwright test), `typecheck` (tsc --noEmit).

- [ ] **Step 1: Install dependencies** in `web/`: runtime `next-themes three @react-three/fiber @react-three/drei gsap @gsap/react resend zod gray-matter unified remark-parse remark-gfm remark-rehype rehype-slug rehype-stringify`. Dev: `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test @types/three`. Run `npx playwright install chromium`. After any install, delete AppleDouble files: `find web -name '._*' -not -path '*/node_modules/*' -delete`.

- [ ] **Step 2: Write the failing tests**

`web/src/lib/site.test.ts`: `site.email === "hello@fiixbee.com"`, `site.name === "FiixBE"`, `site.nav` hrefs equal `["/#how-it-works", "/for-patients", "/for-physios", "/pricing", "/blog"]`.

`web/e2e/foundation.spec.ts`:
- `stored light theme beats dark system theme without flash`: context with `colorScheme: "dark"`, `addInitScript` sets `localStorage.theme = "light"`. Navigate to `/`. Assert `html` has class `light` and the computed `background-color` of `body` is `rgb(246, 246, 243)` on the first `domcontentloaded`.
- `theme toggle switches and persists`: click the toggle (accessible name "Switch to light theme" / "Switch to dark theme"). Reload. Assert the class persists.
- `old html urls redirect`: for each of `/index.html -> /`, `/for-physios.html -> /for-physios`, `/for-patients.html`, `/pricing.html`, `/about.html`, `/contact.html`, `/blog.html`, `/session.html`, assert `response.status()` is 308 with the right `location` (use `request.get(url, { maxRedirects: 0 })`).
- `no banned styling`: on `/`, evaluate every element's computed style. Assert none has `text-transform: uppercase` and none has a `background-image` containing `gradient`.

- [ ] **Step 3: Run tests to verify they fail.** Run `npm test` and `npm run test:e2e` in `web/`. Expected: FAIL (module `@/lib/site` missing, redirects 404).

- [ ] **Step 4: Implement.** Tokens in `globals.css` with `:root` = light and `.dark` = dark, mapped into Tailwind v4 `@theme inline`. `next-themes` with `attribute="class"`, `defaultTheme="system"`, `storageKey="theme"`, `disableTransitionOnChange`. `<html suppressHydrationWarning>`. Header per spec section "Homepage structure", item 1, with the mobile menu as a full-screen sheet below 768px. Footer: About, Contact, Blog, Privacy note, `site.email` as a `mailto:` link, `site.location`, `site.appsComingSoon`. `Logo`: trace the mark from `website/assets/fixbe_jpg.jpeg` into an inline SVG that uses `currentColor` (the mark is a circle head plus two crossing arcs). Use the `Glyph` plus the wordmark "FiixBE" set in Hanken Grotesk 600. Redirects in `next.config.ts` `redirects()` with `permanent: true`. Metadata: title template `"%s | FiixBE"`, default title "FiixBE - Physiotherapy that watches every rep", `metadataBase` `https://fiixbee.com`.

- [ ] **Step 5: Run tests to verify they pass.** `npm test && npm run test:e2e && npm run typecheck && npm run lint`. Expected: all PASS, zero lint errors.

- [ ] **Step 6: Commit** (if Parth asked for commits): `feat(web): foundation, tokens, theme, layout, redirects`.

### Task 2: Pose library, media assets, and extraction script

**Files:**
- Create: `web/src/lib/pose/clip.ts`, `web/src/lib/pose/geometry.ts`, `web/src/lib/pose/reps.ts`, `web/src/lib/pose/draw.ts`, `web/src/lib/pose/index.ts`, tests `web/src/lib/pose/*.test.ts`, `web/public/media/squat-720.mp4`, `web/public/media/squat-poster.jpg`, `web/public/media/squat.pose.json`, `web/scripts/pose/extract_pose.py`, `web/scripts/pose/requirements.txt`, `web/scripts/pose/README.md`, `web/credits/media.md`
- Source material: `.superpowers/prototype/extract_pose.py`, `.superpowers/prototype/pose_compact.json`, `.superpowers/prototype/variations.template.html` (working reference implementation of all functions below, in its `<script>`)

**Interfaces:**
- Produces in `@/lib/pose`:
  - `type PoseClip = { fps: number; step: number; w: number; h: number; k: number[]; n: number; p: number[] }` (the `pose_compact.json` shape: `k` = MediaPipe landmark ids, `p` = flat `[x, y]` per landmark per frame in thousandths).
  - `LANDMARKS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32]`, `EDGES: [number, number][]` (14 pairs from the reference), `JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]`.
  - `keypoint(clip: PoseClip, t: number, landmark: number): [number, number]` (normalized 0..1, linear interpolation between samples, clamps at the last frame).
  - `jointAngle(clip: PoseClip, t: number, a: number, b: number, c: number): number` (degrees, corrects for the `h / w` aspect).
  - `kneeAngle(clip, t) = jointAngle(clip, t, 23, 25, 27)`.
  - `coverBox(boxW: number, boxH: number, mediaW: number, mediaH: number, posX = 0.5, posY = 0.5): { ox: number; oy: number; w: number; h: number }` (object-fit: cover math).
  - `class RepCounter { constructor(opts?: { down?: number; up?: number; target?: number }); update(angle: number): { reps: number; cue: Cue }; reset(): void }` with defaults `down = 115`, `up = 160`, `target = 10`. A rep counts when the angle goes below `down` and then above `up`. After `target`, the next rep counts as 1.
  - `type Cue = "Stand tall to begin" | "Lower slowly" | "Good depth, hold" | "Push up through your heels" | "Good rep. Stand tall"` with the selection rules from the reference `draw()`.
  - `drawSkeleton(ctx: CanvasRenderingContext2D, clip: PoseClip, t: number, box: { ox: number; oy: number; w: number; h: number }, opts?: { arcAt?: 25 }): void` (colors from Global Constraints, line width `max(2, box.w / 160)`).
  - `loadPoseClip(url = "/media/squat.pose.json"): Promise<PoseClip>`.

- [ ] **Step 1: Write the failing tests** using `.superpowers/prototype/pose_compact.json` copied to `web/public/media/squat.pose.json` as the fixture:
  - `kneeAngle(clip, 0)` is greater than 170.
  - The minimum of `kneeAngle` sampled every 0.1 s over 0 to 29 s is between 90 and 105.
  - Feeding `kneeAngle` sampled every 1/30 s over the whole clip into a `RepCounter` gives `reps === 3`.
  - `keypoint(clip, 1e6, 25)` equals `keypoint(clip, (clip.n - 1) * clip.step / clip.fps, 25)`.
  - `coverBox(400, 640, 720, 1366, 0.5, 0.85)` returns `w = 400`, `h ≈ 758.9`, `ox = 0`, `oy ≈ -101.1`.
  - `RepCounter` with `target = 2` returns reps 1, 2, then 1 across three down-up cycles.

- [ ] **Step 2: Run tests to verify they fail.** `npm test -- pose`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement** the functions above, porting the reference script.

- [ ] **Step 4: Media.** Download `https://videos.pexels.com/video-files/7117089/7117089-hd_720_1366_30fps.mp4`. Re-encode with ffmpeg to H.264, `-crf 28`, no audio, `+faststart`, under 3 MB, to `squat-720.mp4`. Extract the frame at 0.5 s as `squat-poster.jpg` (quality 80). Record the Pexels page `https://www.pexels.com/video/daytime-workout-of-a-woman-7117089/` in `credits/media.md`.

- [ ] **Step 5: Extraction script.** Port `extract_pose.py` and add the compaction step (keep `LANDMARKS`, 15 samples per second, integers in thousandths). The script downloads `pose_landmarker_heavy.task` if missing. Usage: `python extract_pose.py <video> <out.json>`. Run it on `squat-720.mp4` and confirm `jq '.n'` is within 2 of the fixture's `n`.

- [ ] **Step 6: Run tests to verify they pass.** `npm test -- pose && npm run typecheck`. Expected: PASS.

- [ ] **Step 7: Commit:** `feat(web): pose library, squat clip and extraction script`.

### Task 3: Phone screens and 2D phone

**Files:**
- Create: `web/src/components/phone/PhoneFrame.tsx`, `web/src/components/phone/screens/LiveScreen.tsx`, `web/src/components/phone/screens/SummaryScreen.tsx`, `web/src/components/phone/screens/PlanScreen.tsx`, `web/src/components/phone/usePoseVideo.ts`, `web/src/components/phone/screens.test.tsx`, `web/public/images/avatars/*`, `web/credits/avatars.md`
- Reference: the "FiixBE app" section of `.superpowers/brainstorm/56173-1793266872/content/b-variations.html`

**Interfaces:**
- Consumes: everything in `@/lib/pose`.
- Produces:
  - `type ScreenId = "live" | "summary" | "plan"`.
  - `<PhoneFrame width?: number>{children}</PhoneFrame>`: the 2D device (black body, 10px bezel, 48px outer radius, island). Default width 300, height = width x 2.1.
  - `<LiveScreen />`: muted, looping, `playsInline` video of `/media/squat-720.mp4` with `poster="/media/squat-poster.jpg"`, a canvas skeleton, rep counter "n of 10", cue sheet, knee angle, progress bar.
  - `<SummaryScreen />` and `<PlanScreen />` with the mockup's content. "Your physio" uses a photo avatar from `public/images/avatars/`. The patient name is "Riya".
  - `usePoseVideo(videoRef, canvasRef): { angle: number | null; reps: number; cue: Cue; playing: boolean }`. It loads the clip, draws with `requestVideoFrameCallback` media time (fallback `currentTime`), and resizes the canvas for `devicePixelRatio`.

- [ ] **Step 1: Write the failing tests** (Vitest + Testing Library, jsdom, with `HTMLMediaElement.prototype.play` mocked to reject):
  - `LiveScreen shows the poster and no skeleton when autoplay is blocked`: the `video` has the poster attribute, `playing` stays false, and `canvas.getContext("2d").clearRect` is the only draw call.
  - `SummaryScreen renders score 92 and "Sent to your physio"`.
  - `PlanScreen lists Squats, Hamstring stretch, Split squats`.
  - No rendered text contains "—" or emoji (regex `/\p{Extended_Pictographic}/u`).

- [ ] **Step 2: Run tests to verify they fail.** `npm test -- screens`. Expected: FAIL.

- [ ] **Step 3: Implement.** Find 2 free Unsplash portrait photos for avatars (one physio, one patient), crop to 160x160 webp.

- [ ] **Step 4: Run tests to verify they pass.** Expected: PASS.

- [ ] **Step 5: Commit:** `feat(web): phone frame and app screens`.

### Task 4: 3D phone stage and scroll story (homepage only)

**Files:**
- Create: `web/src/components/phone-stage/PhoneStage.tsx` (client, picks 3D or 2D), `web/src/components/phone-stage/Phone3D.tsx`, `web/src/components/phone-stage/PhoneModel.tsx`, `web/src/components/phone-stage/Phone2DStage.tsx`, `web/src/components/phone-stage/useScrollStory.ts`, `web/src/lib/device.ts`, `web/src/lib/device.test.ts`, `web/e2e/phone-stage.spec.ts`

**Interfaces:**
- Consumes: `PhoneFrame`, `LiveScreen`, `SummaryScreen`, `PlanScreen`, `ScreenId`.
- Produces:
  - `canUse3D(env: { webgl2: boolean; deviceMemory?: number; cores?: number; reducedMotion: boolean }): boolean`. True when `webgl2` is true, `deviceMemory` is undefined or 4 or more, `cores` is undefined or 4 or more, and `reducedMotion` is false.
  - `readDeviceEnv(): Parameters<typeof canUse3D>[0]` (browser only).
  - `useScrollStory(sectionRef): { progress: MutableRefObject<number>; screen: ScreenId }`. Uses GSAP ScrollTrigger with `pin: true`. Screen changes at progress 0.33 ("summary") and 0.66 ("plan").
  - `<PhoneStage notes: { title: string; body: string; screen: ScreenId }[] />`.
- Behavior:
  - `PhoneModel`: procedural body (drei `RoundedBox`, about 0.075 x 0.155 x 0.008 units, radius 0.011), matte dark aluminium frame, side buttons, camera bump. The screen is drei `<Html transform occlude="blending">` that hosts the active screen component.
  - Scroll keyframes: before pin, rotation `(x: 0.35, y: -0.6)`, settling to `(0, 0)` as the section reaches the top. While pinned, a gentle y sway of ±0.12 rad keeps it alive. Screen content cross-fades over 250 ms.
  - Load `Phone3D` with `next/dynamic` and `ssr: false`, after the hero text renders. Show `Phone2DStage` while it loads and whenever `canUse3D` is false.
  - `Phone2DStage` uses the same `useScrollStory` and applies CSS `perspective` and `rotateX/rotateY` from `progress`.
  - With reduced motion, no pin and no rotation. The phone is face-on with the notes stacked.

- [ ] **Step 1: Write the failing tests.** `device.test.ts`: `canUse3D` is false for each of `webgl2: false`, `deviceMemory: 2`, `cores: 2`, `reducedMotion: true`, and true for `{ webgl2: true, reducedMotion: false }`. `phone-stage.spec.ts`: with `reducedMotion: "reduce"`, the homepage has no `canvas[data-engine]` (the R3F canvas) and shows the 2D phone face-on. With default settings on desktop Chromium, an R3F canvas exists after load, and scrolling through the section changes the visible screen heading from the live screen to "Session complete" to "Good morning, Riya".

- [ ] **Step 2: Run tests to verify they fail.** Expected: FAIL.

- [ ] **Step 3: Implement.** Register ScrollTrigger once with `gsap.registerPlugin`. Use `useGSAP` for cleanup.

- [ ] **Step 4: Run tests to verify they pass.** Also measure: `npm run build` and confirm the homepage first-load JS that excludes the dynamic 3D chunk is under 200 KB gzipped, and the 3D chunk is under 250 KB gzipped (read the build output).

- [ ] **Step 5: Commit:** `feat(web): 3D phone stage with scroll story`.

### Task 5: Homepage

**Files:**
- Modify: `web/src/app/page.tsx`
- Create: `web/src/components/home/Hero.tsx`, `web/src/components/home/Problem.tsx`, `web/src/components/home/HowItWorks.tsx`, `web/src/components/home/BothSides.tsx`, `web/src/components/home/ClosingCta.tsx`, `web/e2e/home.spec.ts`, `web/credits/home.md`
- Source content: `website/index.html`

**Interfaces:**
- Consumes: `PhoneStage`, `Button`, `Container`, `site`.

- [ ] **Step 1: Write the failing test** `home.spec.ts`: the `h1` text is "See every degree of your recovery."; "Start your recovery" links to `/session`; "For physiotherapists" links to `/for-physios`; the page contains `site.appsComingSoon`; the page has a section with id `how-it-works`; the page passes `@axe-core/playwright` with no serious or critical violations in both themes (install `@axe-core/playwright` as a dev dependency).

- [ ] **Step 2: Run it to verify it fails.**

- [ ] **Step 3: Implement** in the order of spec section "Homepage structure". The notes are the four from the spec, mapped live, live, summary, plan. Port the problem, how-it-works (prescribe, practice, review), both-sides, and closing sections from `website/index.html`. Keep the stats only with a source link, or drop them. Self-host every photo.

- [ ] **Step 4: Run it to verify it passes.**

- [ ] **Step 5: Commit:** `feat(web): homepage`.

### Task 6: Marketing pages (for patients, for physios, pricing, about)

**Files:**
- Create: `web/src/app/for-patients/page.tsx`, `web/src/app/for-physios/page.tsx`, `web/src/app/pricing/page.tsx`, `web/src/app/about/page.tsx`, section components under `web/src/components/<page>/`, `web/e2e/pages.spec.ts`, `web/credits/pages.md`
- Source content: the matching `website/*.html` files.

- [ ] **Step 1: Write the failing test** `pages.spec.ts`. For each route: status 200, exactly one `h1`, a `<title>` ending in "| FiixBE", no text matching "PhysioAI", "Fixbee", "—", or emoji, and no serious or critical axe violations. Pricing: the physio plans and the "first 50 clinics get 3 months free" offer link to `/contact`.

- [ ] **Step 2: Run it to verify it fails.**

- [ ] **Step 3: Implement** each page with the current content, restyled with the B2 system: serif section headlines, plain grotesque body, thin `--line` rules, photos with `rounded-2xl`, no cards-with-shadows grids. Each page ends with a call to action to `/session` (patients) or `/contact` (physios, pricing).

- [ ] **Step 4: Run it to verify it passes.**

- [ ] **Step 5: Commit:** `feat(web): patients, physios, pricing and about pages`.

### Task 7: Contact page, contact API, and newsletter API

**Files:**
- Create: `web/src/app/contact/page.tsx`, `web/src/components/contact/ContactForm.tsx`, `web/src/app/api/contact/route.ts`, `web/src/app/api/newsletter/route.ts`, `web/src/lib/mail/contact.ts`, `web/src/lib/mail/rate-limit.ts`, `web/src/lib/mail/contact.test.ts`, `web/src/lib/mail/rate-limit.test.ts`, `web/e2e/contact.spec.ts`, `web/.env.example`

**Interfaces:**
- Produces:
  - `contactSchema` (zod): `name` 1..100, `email` valid, `role` one of `"patient" | "physiotherapist" | "clinic" | "other"`, `message` 10..4000, `company` (honeypot) must be empty or absent.
  - `type MailSender = (msg: { to: string; replyTo: string; subject: string; text: string }) => Promise<void>`.
  - `handleContact(body: unknown, ip: string, send: MailSender, limiter: RateLimiter): Promise<{ status: 200 | 400 | 429 | 502; body: { ok: boolean; error?: string } }>`.
  - `class RateLimiter { constructor(max: number, windowMs: number); hit(key: string, now?: number): boolean }` (true means allowed). The route uses `max = 5`, `windowMs = 600000`.
  - `resendSender(apiKey: string, from: string): MailSender`.
  - Env: `RESEND_API_KEY`, `RESEND_FROM` (for example `FiixBE website <website@fiixbee.com>`), `RESEND_AUDIENCE_ID`, `CONTACT_TO` (default `hello@fiixbee.com`).
- Behavior: a honeypot hit returns 200 with `ok: true` and sends nothing. A missing `RESEND_API_KEY` or a send failure returns 502. The form then shows "We could not send your message. Email us at hello@fiixbee.com." The success state shows "Thanks, we will reply within one working day." The subject is `New enquiry from <name> (<role>)`.

- [ ] **Step 1: Write the failing tests.** Unit tests for each behavior above, with a fake `MailSender` that records calls. `RateLimiter` allows 5 hits, rejects the 6th, and allows again after the window. `contact.spec.ts` uses `page.route('/api/contact')` to return 200, then 502, and asserts both messages.

- [ ] **Step 2: Run them to verify they fail.**

- [ ] **Step 3: Implement.** Route handlers read their guide in `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` first. Newsletter: zod email, honeypot, rate limit, `resend.contacts.create({ email, audienceId })`, same 502 handling.

- [ ] **Step 4: Run them to verify they pass.**

- [ ] **Step 5: Commit:** `feat(web): contact form and newsletter wired to Resend`.

### Task 8: Blog

**Files:**
- Create: `web/content/blog/*.md` (from `.superpowers/blog-drafts/*.mdx`, renamed to `.md`), `web/src/lib/blog.ts`, `web/src/lib/blog.test.ts`, `web/src/app/blog/page.tsx`, `web/src/app/blog/[slug]/page.tsx`, `web/src/components/blog/NewsletterForm.tsx`, `web/e2e/blog.spec.ts`, `web/credits/blog.md`

**Interfaces:**
- Produces:
  - `type PostMeta = { title: string; slug: string; description: string; category: string; date: string; readingMinutes: number; author: string; reviewedBy: string; featured: boolean; image: { src: string; page: string; photographer: string; alt: string }; sources: { title: string; url: string }[] }`.
  - `getAllPosts(): Promise<PostMeta[]>` (newest first), `getPost(slug: string): Promise<{ meta: PostMeta; html: string } | null>`.
- Behavior: validate frontmatter with zod at build time and fail the build on a bad post. Self-host each post image in `public/images/blog/<slug>.webp` and point `image.src` at it. The article page shows category, date, reading time, author with the FiixBE mark as avatar, "Reviewed by <name>" only when `reviewedBy` is set, the body, a "Sources" list, the disclaimer, and a call to action to `/session`. `generateStaticParams` returns every slug. An unknown slug calls `notFound()`.

- [ ] **Step 1: Write the failing tests.** `blog.test.ts`: every file in `content/blog` parses, slugs are unique, exactly one post has `featured: true`, no body contains "—" or emoji or "PhysioAI", and every post has at least 3 sources. `blog.spec.ts`: `/blog` shows the featured post first and links to every post. Each post page has an `h1` equal to its title and a "Sources" heading. `/blog/does-not-exist` returns 404.

- [ ] **Step 2: Run them to verify they fail.**

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run them to verify they pass.**

- [ ] **Step 5: Commit:** `feat(web): blog with researched articles`.

### Task 9: Session page (live exercise on the web)

**Files:**
- Create: `web/src/app/session/page.tsx`, `web/src/components/session/SessionFlow.tsx`, `web/src/components/session/SelectStep.tsx`, `web/src/components/session/AlignStep.tsx`, `web/src/components/session/LiveStep.tsx`, `web/src/components/session/ReportSheet.tsx`, `web/src/components/session/useCamera.ts`, `web/src/components/session/usePoseSocket.ts`, `web/src/lib/session/protocol.ts`, `web/src/lib/session/reducer.ts`, `web/src/lib/session/reducer.test.ts`, `web/e2e/session.spec.ts`
- Source behavior: `website/session.html` (all of its `<script>`)

**Interfaces:**
- Produces in `@/lib/session/protocol`:
  - `EXERCISES = [{ key: "knee_extension", name: "Knee extension" }, { key: "shoulder_raises", name: "Shoulder raises" }, { key: "straight_leg_raise", name: "Straight leg raise" }]`, with the instructions text from `session.html`.
  - `type ServerMessage = { stage: string | null; rep_count: number; last_rep_score: number | null; session_avg_score: number | null; feedback: string; severity: "good" | "success" | "warning" | "error" | ""; angle: number | null; angle2: number | null; hold_progress: number; reps_target: number; complete: boolean; view: string | null; summary: Summary | null } | { error: string }`.
  - `type Summary = { avg_score: number; max_score: number; min_score: number; reps_completed: number; completion_pct: number; scores: number[] }`.
  - `wsUrl(base: string, exercise: string, side: "left" | "right", repsTarget: number): string` (base from `NEXT_PUBLIC_POSE_WS_URL`, default `wss://ai-posture-backend.onrender.com/ws/pose`).
  - `encodeFrame(base64Jpeg: string): string` returns `JSON.stringify({ frame })`.
- Produces in `@/lib/session/reducer`: `sessionReducer(state: SessionState, action: SessionAction): SessionState` and `summarize(scores: number[], repsTarget: number): Summary`. State holds the phase (`"select" | "align" | "live" | "report"`), the connection status, the latest message, and the rep scores.
- Behavior to keep from `session.html`: back camera by default with a front/back switch, un-mirrored frames sent every 200 ms as JPEG quality 0.5, reconnect up to 5 times with delays of attempt x 3 s, the report on `complete` or on stop, and score colors (80 or more good, 55 or more ok, otherwise low). Replace every emoji. The alignment step currently fakes progress with random numbers. Keep a short timed "Get into position" step (3 s countdown) instead, and do not fake detection.
- No 3D phone on this page.

- [ ] **Step 1: Write the failing tests.** `reducer.test.ts`: a message with a higher `rep_count` and a non-null `last_rep_score` appends the score. A `complete` message with a summary moves the phase to `"report"`. `summarize([80, 90, 70], 10)` returns avg 80, max 90, min 70, reps 3, completion 30. `session.spec.ts` (Chromium with `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`): use `page.routeWebSocket` to fake the backend, send three messages ending with `complete: true`, and assert the report shows the average score. With camera permission denied (no fake-ui flag, `permissions: []`), assert the "We need your camera" message and a "Try again" button. With the WebSocket route closing every connection, assert the text "Waking up the AI, attempt 1 of 5" appears.

- [ ] **Step 2: Run them to verify they fail.**

- [ ] **Step 3: Implement.** The live step is full-screen on phones and uses the app-screen visual language from Task 3 (rep counter top right, cue sheet at the bottom).

- [ ] **Step 4: Run them to verify they pass.**

- [ ] **Step 5: Commit:** `feat(web): live session page`.

### Task 10: Site-wide polish (SEO, 404, sitemap, performance, final checks)

**Files:**
- Create: `web/src/app/not-found.tsx`, `web/src/app/sitemap.ts`, `web/src/app/robots.ts`, `web/src/app/opengraph-image.tsx`, `web/CREDITS.md` (index of `web/credits/*.md`), `web/e2e/site.spec.ts`
- Modify: `web/README.md` (how to run, test, regenerate the pose JSON, and the env vars)

- [ ] **Step 1: Write the failing test** `site.spec.ts`: `/sitemap.xml` lists every route and every blog post. `/robots.txt` allows all and points to the sitemap. An unknown route shows the custom 404 with a link home. Every page has a meta description.

- [ ] **Step 2: Run it to verify it fails.**

- [ ] **Step 3: Implement.** The OG image shows the logo and the hero headline in Newsreader, on `--bg` dark.

- [ ] **Step 4: Verify.** Run `npm test && npm run test:e2e && npm run typecheck && npm run lint && npm run build`. Then run Lighthouse (mobile) on the production build for `/`: Performance 85 or more, Accessibility 95 or more, LCP under 2.5 s. Take screenshots of every page in both themes at 390 px and 1440 px widths and check each one by eye against the anti-goals.

- [ ] **Step 5: Commit:** `chore(web): seo, 404, sitemap, credits`.

### Task 11: Deploy to Vercel

- [ ] **Step 1:** Run `vercel project ls`. If `fiixbee` does not exist, run `vercel project add fiixbee`.
- [ ] **Step 2:** In `web/`, run `vercel link --project fiixbee --yes`. Set the project's root directory to `web`.
- [ ] **Step 3:** Add env vars for production and preview: `NEXT_PUBLIC_POSE_WS_URL`, `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_AUDIENCE_ID`, `CONTACT_TO`. Ask Parth for the Resend values. Never invent them.
- [ ] **Step 4:** Run `vercel deploy` (preview). Open the URL and run the Task 10 Step 4 visual check against it. Report the URL to Parth.
- [ ] **Step 5:** Production deploy and `vercel domains add fiixbee.com` only after Parth approves the preview. Give Parth the DNS records for the domain and for Resend.
