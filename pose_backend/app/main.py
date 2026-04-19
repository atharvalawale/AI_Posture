import base64
import json
import sys
import os

import numpy as np
import cv2

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError

from app.database import init_db
from app.auth import routes_otp, routes_google
from app.routes import logs

import app.models  # noqa: F401

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from ai_engine.pose_analyser import detect_pose
from ai_engine.exercise.physio_exercises import EXERCISES, get_exercise
from ai_engine.exercise.scoring import ExerciseScorer, session_summary

app = FastAPI(title="AI Physio Posture App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(routes_otp.router)
app.include_router(routes_google.router)
app.include_router(logs.router)


@app.get("/exercises")
def list_exercises():
    return [
        {
            "key": key,
            "name": cls.name,
            "description": cls.description,
            "required_landmarks": cls.required_landmarks,
        }
        for key, cls in EXERCISES.items()
    ]


@app.websocket("/ws/pose/{exercise_key}/{side}")
async def pose_websocket(
    websocket: WebSocket,
    exercise_key: str,
    side: str = "left",
    reps_target: int = 10,
):
    await websocket.accept()

    try:
        exercise_cls = get_exercise(exercise_key)
    except KeyError:
        await websocket.send_text(json.dumps({
            "error": f"Unknown exercise '{exercise_key}'",
            "available": list(EXERCISES.keys())
        }))
        await websocket.close()
        return

    if side not in ("left", "right"):
        await websocket.send_text(json.dumps({"error": "side must be 'left' or 'right'"}))
        await websocket.close()
        return

    scorer = ExerciseScorer(exercise_cls, side=side, reps_target=reps_target)

    try:
        while True:
            try:
                raw = await websocket.receive_text()
            except (WebSocketDisconnect, ConnectionClosedOK, ConnectionClosedError):
                break

            try:
                payload = json.loads(raw)
                frame_b64 = payload.get("frame", "")
            except (json.JSONDecodeError, AttributeError):
                frame_b64 = raw

            try:
                img_bytes = base64.b64decode(frame_b64)
                img_array = np.frombuffer(img_bytes, dtype=np.uint8)
                frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                if frame is None:
                    raise ValueError("Empty frame")
            except Exception as e:
                try:
                    await websocket.send_text(json.dumps({"error": f"Bad frame: {str(e)}"}))
                except Exception:
                    break
                continue

            keypoints = detect_pose(frame)
            result = scorer.update(keypoints)

            # Debug — remove after testing
            print(f"angle={result.angle} view={result.view} stage={result.stage} reps={result.rep_count}")

            response = {
                "stage":             result.stage,
                "rep_count":         result.rep_count,
                "last_rep_score":    result.last_rep_score,
                "session_avg_score": result.session_avg_score,
                "feedback":          result.feedback,
                "severity":          result.severity,
                "angle":             result.angle,
                "angle2":            result.angle2,
                "hold_progress":     result.hold_progress,
                "reps_target":       result.reps_target,
                "complete":          scorer.is_complete,
                "view":              result.view,
                "summary":           session_summary(scorer) if scorer.is_complete else None,
            }

            try:
                await websocket.send_text(json.dumps(response))
            except (WebSocketDisconnect, ConnectionClosedOK, ConnectionClosedError):
                break

            if scorer.is_complete:
                try:
                    await websocket.close()
                except Exception:
                    pass
                break

    except Exception as e:
        print(f"WebSocket error: {e}")
        import traceback
        traceback.print_exc()