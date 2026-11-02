"""Extract a compact pose clip from a video with the MediaPipe pose landmarker (heavy model).

Usage:
    python extract_pose.py <video.mp4> <out.json>

Output (the PoseClip shape read by src/lib/pose):
    {"fps": 30.0, "step": 2, "w": 720, "h": 1366, "k": [0, 11, ...], "n": 440, "p": [x, y, ...]}

`k` lists the kept MediaPipe landmark ids. `p` holds [x, y] per kept landmark per sample,
flattened, as integers in thousandths of the frame width and height. The script samples
about 15 times per second. Frames where MediaPipe finds no person reuse the nearest
detected pose, so the clip has no gaps.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task"
)
# Kept outside the repo (about 30 MB). Set POSE_MODEL to use a model file you already have.
MODEL_PATH = Path(os.environ.get("POSE_MODEL", Path.home() / ".cache" / "fiixbe" / "pose_landmarker_heavy.task"))

# Must match LANDMARKS in src/lib/pose/clip.ts.
LANDMARKS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32]
SAMPLES_PER_SECOND = 15


def ensure_model() -> Path:
    if not MODEL_PATH.exists():
        print(f"Downloading {MODEL_URL}")
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        tmp = MODEL_PATH.with_suffix(".part")
        urllib.request.urlretrieve(MODEL_URL, tmp)
        tmp.rename(MODEL_PATH)
    return MODEL_PATH


def detect(video: str) -> tuple[float, int, int, int, list[list[tuple[float, float]] | None]]:
    """Runs the landmarker on every `step`-th frame. Returns fps, step, width, height, frames."""
    cap = cv2.VideoCapture(video)
    if not cap.isOpened():
        sys.exit(f"Cannot open {video}")
    fps = cap.get(cv2.CAP_PROP_FPS)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    step = max(1, round(fps / SAMPLES_PER_SECOND))

    options = vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(ensure_model())),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
    )
    frames: list[list[tuple[float, float]] | None] = []
    with vision.PoseLandmarker.create_from_options(options) as landmarker:
        i = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if i % step == 0:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                res = landmarker.detect_for_video(image, int(i * 1000 / fps))
                if res.pose_landmarks:
                    frames.append([(p.x, p.y) for p in res.pose_landmarks[0]])
                else:
                    frames.append(None)
            i += 1
    cap.release()
    return fps, step, w, h, frames


def fill_gaps(frames: list[list[tuple[float, float]] | None]) -> list[list[tuple[float, float]]]:
    """Replaces missing poses with the nearest detected one (previous first, then next)."""
    if not any(frames):
        sys.exit("No person found in the video")
    filled: list[list[tuple[float, float]] | None] = list(frames)
    last = None
    for i, f in enumerate(filled):
        if f is None:
            filled[i] = last
        else:
            last = f
    first = next(f for f in filled if f is not None)
    return [f if f is not None else first for f in filled]


def compact(fps: float, step: int, w: int, h: int, frames: list[list[tuple[float, float]]]) -> dict:
    flat: list[int] = []
    for f in frames:
        for k in LANDMARKS:
            x, y = f[k]
            flat.extend((round(x * 1000), round(y * 1000)))
    return {"fps": fps, "step": step, "w": w, "h": h, "k": LANDMARKS, "n": len(frames), "p": flat}


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    video, out = sys.argv[1], sys.argv[2]
    fps, step, w, h, frames = detect(video)
    missing = sum(1 for f in frames if f is None)
    clip = compact(fps, step, w, h, fill_gaps(frames))
    Path(out).write_text(json.dumps(clip, separators=(",", ":")))
    size = Path(out).stat().st_size / 1024
    print(f"{clip['n']} samples ({missing} without a pose), {w}x{h} at {fps:g} fps, step {step}, {size:.0f} KB")


if __name__ == "__main__":
    main()
