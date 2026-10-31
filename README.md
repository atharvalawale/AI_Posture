# FiixBE

FiixBE helps patients do physiotherapy exercises at home. The phone camera tracks each rep, measures joint angles and reports the session to the physiotherapist.

This repository holds the website, the pose backend and the pose analysis engine.

## Project structure

| Path | Contents |
|---|---|
| `web/` | The website at [fiixbee.com](https://fiixbee.com): marketing pages, blog and the web exercise session. Next.js 16, React 19, TypeScript, Tailwind CSS v4. |
| `pose_backend/` | The FastAPI backend. It receives camera frames over WebSocket and returns pose landmarks, rep counts and scores. It also handles sign-in and session logs. |
| `ai_engine/` | The pose analysis engine that the backend uses: MediaPipe pose detection, exercise definitions and scoring. |
| `frontend/` | A webcam test page for the pose backend. Use it to test the backend without the website. |
| `docs/` | Design specs and implementation plans. |
| `requirements.txt` | Python dependencies for `pose_backend/` and `ai_engine/`. |

## Website

The website needs Node.js 24.

1. Go to the `web/` folder.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the values.
4. Run `npm run dev`.
5. Open http://localhost:3000.

`NEXT_PUBLIC_POSE_WS_URL` sets the pose backend that the web session uses. To use a local backend, set it to `ws://localhost:8000/ws/pose`.

`web/README.md` has the test commands and a map of the code.

## Pose backend

The backend needs Python 3.10. MediaPipe does not support Python 3.13.

1. Create a virtual environment with Python 3.10 and activate it.
2. From the repository root, run `pip install -r requirements.txt`.
3. Create `pose_backend/.env` with `SECRET_KEY` and `GOOGLE_CLIENT_ID`.
4. Go to the `pose_backend/` folder.
5. Run `uvicorn app.main:app --reload`.

The backend listens on http://localhost:8000. The pose WebSocket is at `ws://localhost:8000/ws/pose`.

To test the backend without the website, open `frontend/index.html` in a browser and allow camera access.

## Deployment

The website and the pose backend deploy separately. The website runs on Vercel. The pose backend runs on Render. The website connects to the backend over a WebSocket.

| Part | Host | Project or service | Public URL |
|---|---|---|---|
| Website | Vercel | `fiixbee` | https://www.fiixbee.com |
| Pose backend | Render | `fiixbee-pose-backend` | https://fiixbee-pose-backend.onrender.com |

### Deploy the website to Vercel

Vercel does not deploy from git for this project. Deploy with the Vercel CLI.

1. Install the Vercel CLI with `npm install -g vercel`, or use `npx vercel`.
2. Go to the `web/` folder.
3. Run `vercel link` and select the project `fiixbee`. Do this one time only.
4. Run `vercel deploy --prod`.
5. Open https://www.fiixbee.com and make sure that the 3D phone and the live session load.

To deploy a preview instead, run `vercel deploy` without `--prod`.

The website reads these environment variables in Vercel (Project settings > Environment Variables):

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_POSE_WS_URL` | `wss://fiixbee-pose-backend.onrender.com/ws/pose` | The pose backend for `/session`. Next.js puts this value into the browser code at build time. After you change it, deploy again. |
| `RESEND_API_KEY` | A Resend API key | Sends the contact form email. A key with "Sending access" can send email only. Newsletter sign-ups need a key with "Full access". |
| `RESEND_AUDIENCE_ID` | A Resend segment ID | Optional. Newsletter sign-ups join this segment. |
| `RESEND_FROM` | `FiixBE website <website@fiixbee.com>` | Optional. The domain must be verified in Resend. |
| `CONTACT_TO` | `hello@fiixbee.com` | Optional. The inbox that receives contact form messages. |

`web/.env.example` describes each variable.

### Deploy the pose backend to Render

The Render service `fiixbee-pose-backend` builds from the public GitHub repository `atharvalawale/AI_Posture`. It deploys automatically after each push to its branch. It rebuilds only when a file in `pose_backend/`, `ai_engine/` or `requirements.txt` changes.

To deploy a backend change:

1. Commit the change.
2. Push it to the branch that the service deploys from. The branch is `feat/nextjs-website` until the website pull request merges.
3. Open the service in the Render dashboard and wait until the deploy status is "Live". A full build takes about 2 minutes.
4. Open https://fiixbee-pose-backend.onrender.com/exercises. Make sure that it returns the list of exercises.
5. Open https://www.fiixbee.com/session and do a few reps. Make sure that the skeleton and the angle follow you.

After the website pull request merges, change the branch to `main`. In the Render dashboard, open the service and go to Settings > Build & Deploy > Branch.

To deploy without a new commit, open the service in the Render dashboard and select Manual Deploy > Deploy latest commit.

The service uses these settings:

| Setting | Value |
|---|---|
| Runtime | Python |
| Build command | `pip install -r requirements.txt` |
| Start command | `cd pose_backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check path | `/exercises` |
| Region | Singapore |
| Plan | Free |

The service reads these environment variables:

| Variable | Value | Notes |
|---|---|---|
| `PYTHON_VERSION` | `3.10.14` | MediaPipe 0.10.14 does not support Python 3.13. |
| `SECRET_KEY` | A long random string | Signs the sign-in tokens. Generate one with `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`. |
| `GOOGLE_CLIENT_ID` | A Google OAuth client ID | Optional. Only Google sign-in needs it. The live session does not. |
| `DATABASE_URL` | A database URL | Optional. The default is the SQLite file `pose_backend/physio.db`. On Render, this file resets after each deploy. |

On the free plan, Render stops the service after 15 minutes without traffic. The next visitor then waits up to about a minute while the service starts. The website retries the connection up to 5 times. To keep the service running all the time, change the plan to a paid instance type in Settings > Instance Type.

### Move the backend to a new URL

If the backend URL changes, update these places:

1. `NEXT_PUBLIC_POSE_WS_URL` in Vercel, then deploy the website again.
2. `DEFAULT_WS_BASE` in `web/src/lib/session/protocol.ts`. The website uses it when the variable is not set.
3. `NEXT_PUBLIC_POSE_WS_URL` in `web/.env.example`.
4. The tables in this section.
