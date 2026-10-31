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

- The website deploys to Vercel, project `fiixbee`, from the `web/` folder.
- The pose backend runs on Render at `ai-posture-backend.onrender.com`.
