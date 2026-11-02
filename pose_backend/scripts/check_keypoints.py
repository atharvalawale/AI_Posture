"""
check_keypoints.py
End-to-end check of the pose WebSocket: starts the real server, sends a frame with a person and
a frame without one, and checks every response keeps the old fields and adds `keypoints`.
Uses only the backend's own dependencies (uvicorn, websockets, opencv).

    cd pose_backend && python scripts/check_keypoints.py
"""
import asyncio
import base64
import json
import os
import socket
import subprocess
import sys
import tempfile
import time

import cv2
import numpy as np
import websockets

BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROOT = os.path.abspath(os.path.join(BACKEND, ".."))
PERSON = os.path.join(ROOT, "web", "public", "media", "squat-poster.jpg")

OLD_FIELDS = [
    "stage", "rep_count", "last_rep_score", "session_avg_score", "feedback", "severity",
    "angle", "angle2", "hold_progress", "reps_target", "complete", "view", "summary",
]


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def jpeg_b64(image):
    ok, buf = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 50])
    assert ok, "could not encode the test frame"
    return base64.b64encode(buf.tobytes()).decode()


async def exchange(url, frames):
    async with websockets.connect(url) as ws:
        replies = []
        for frame in frames:
            await ws.send(json.dumps({"frame": frame}))
            replies.append(json.loads(await ws.recv()))
        return replies


def check_reply(reply):
    missing = [f for f in OLD_FIELDS if f not in reply]
    assert not missing, f"old fields missing: {missing}"
    assert list(reply)[: len(OLD_FIELDS)] == OLD_FIELDS, "old fields changed order"
    assert "keypoints" in reply, "no keypoints field"


def check_person(reply):
    check_reply(reply)
    kps = reply["keypoints"]
    assert isinstance(kps, list) and len(kps) == 33, f"expected 33 landmarks, got {kps!r:.80}"
    for i, k in enumerate(kps):
        assert isinstance(k, list) and len(k) == 3, f"landmark {i} is not [x, y, visibility]: {k}"
        for v in k:
            assert isinstance(v, (int, float)), f"landmark {i} has a non-number: {k}"
            assert round(v, 3) == v, f"landmark {i} is not rounded to 3 decimals: {k}"
        assert 0 <= k[2] <= 1, f"landmark {i} visibility out of range: {k}"
    # Hips and knees of the squatting person should be found, inside the frame.
    for i in (23, 24, 25, 26):
        x, y, v = kps[i]
        assert 0 <= x <= 1 and 0 <= y <= 1, f"landmark {i} outside the frame: {kps[i]}"
    assert max(kps[i][2] for i in (23, 24, 25, 26)) > 0.5, "the person's hips and knees were not seen"


def main():
    person = cv2.imread(PERSON)
    assert person is not None, f"missing test image {PERSON}"
    empty = np.full((480, 640, 3), 40, dtype=np.uint8)

    port = free_port()
    tmp = tempfile.mkdtemp()
    env = dict(os.environ, DATABASE_URL=f"sqlite:///{os.path.join(tmp, 'check.db')}", PYTHONUNBUFFERED="1")
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(port), "--log-level", "warning"],
        cwd=BACKEND, env=env, stdout=subprocess.DEVNULL,
    )
    try:
        deadline = time.time() + 60
        while True:
            try:
                socket.create_connection(("127.0.0.1", port), timeout=1).close()
                break
            except OSError:
                if server.poll() is not None or time.time() > deadline:
                    raise SystemExit("the server did not start")
                time.sleep(0.3)

        url = f"ws://127.0.0.1:{port}/ws/pose/knee_extension/left?reps_target=3"
        # A still image is one frame of a session; send it a few times so tracking settles.
        frames = [jpeg_b64(person)] * 3 + [jpeg_b64(empty)] * 3
        replies = asyncio.run(exchange(url, frames))

        check_person(replies[2])
        for reply in replies[3:]:
            check_reply(reply)
        assert replies[-1]["keypoints"] is None, f"expected no keypoints without a person, got {replies[-1]['keypoints']!r:.80}"

        example = dict(replies[2])
        example["keypoints"] = example["keypoints"][:2] + ["..."]
        print("person frame:", json.dumps(example))
        print("empty frame keypoints:", replies[-1]["keypoints"])
        print("size of one person reply:", len(json.dumps(replies[2])), "bytes")
        print("ok")
    finally:
        server.terminate()
        server.wait(timeout=10)


if __name__ == "__main__":
    main()
