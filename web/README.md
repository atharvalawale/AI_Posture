# FiixBE website

The marketing site and web exercise session for [fiixbee.com](https://fiixbee.com). Built with Next.js 16 (App Router, Cache Components), React 19, TypeScript and Tailwind CSS v4.

Design spec: `../docs/superpowers/specs/2026-10-29-fiixbe-nextjs-website-design.md`.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Copy `.env.example` to `.env.local` and fill in the values. Without `RESEND_API_KEY`, the contact and newsletter forms return an error that tells the visitor to email hello@fiixbee.com.

## Test it

```bash
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests (Playwright) against a production build
npm run typecheck
npm run lint
```

To run the browser tests against a dev server instead, set `E2E_DEV=1`. To run several dev servers side by side, give each one its own `NEXT_DIST_DIR` and `E2E_PORT`.

## Where things live

| Path | What |
|---|---|
| `src/app/` | Routes. The homepage is `page.tsx`. API routes are in `api/`. |
| `src/app/fonts.ts` | The only place fonts are chosen. |
| `src/app/globals.css` | Color tokens for light and dark mode. Components use tokens only. |
| `src/components/phone-stage/` | The 3D phone and its scroll story. Homepage only. |
| `src/components/phone/` | The app screens shown on the phone, shared by the 3D and 2D phone. |
| `src/components/session/` | The live exercise session. It talks to the pose backend over WebSocket. |
| `src/lib/pose/` | Pose math: keypoints, joint angles, rep counting, skeleton drawing. |
| `content/blog/` | Blog posts as Markdown. |
| `credits/` | Sources and licenses for every photo and video. |

## Add a blog post

1. Add `content/blog/<slug>.md` with the same frontmatter as the existing posts.
2. Add its image to `public/images/blog/<slug>.webp` and credit it in `credits/blog.md`.
3. Run `npm run blog:manifest`. The proxy uses this list to answer unknown slugs with a 404. The build runs it too.

## Regenerate the pose data

The skeleton on the homepage phone is real MediaPipe output for `public/media/squat-720.mp4`.

```bash
cd scripts/pose
python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python extract_pose.py ../../public/media/squat-720.mp4 ../../public/media/squat.pose.json
```

## Environment variables

| Name | Used for |
|---|---|
| `RESEND_API_KEY` | Sending contact form mail and adding newsletter contacts. Needs a full access key. |
| `RESEND_FROM` | Sender, for example `FiixBE website <website@fiixbee.com>`. The domain must be verified in Resend. |
| `RESEND_AUDIENCE_ID` | The Resend segment that newsletter sign-ups join. |
| `CONTACT_TO` | Where contact form messages go. Defaults to `hello@fiixbee.com`. |
| `NEXT_PUBLIC_POSE_WS_URL` | The pose backend WebSocket base URL. Defaults to `wss://ai-posture-backend.onrender.com/ws/pose`. |

## Working on the exFAT drive

The repo lives on an exFAT drive. macOS writes `._*` files next to new files there. Git ignores them, and the Turbopack file-system cache is off because they corrupt it. If something behaves strangely, run:

```bash
find . -name '._*' -not -path './node_modules/*' -delete
```
