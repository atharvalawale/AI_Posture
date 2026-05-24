import cv2
import math
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import urllib.request
import os
import tempfile

# ── Download pose model ───────────────────────────────────────
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
MODEL_PATH = os.path.join(tempfile.gettempdir(), "pose_landmarker.task")

def _ensure_model():
    if not os.path.exists(MODEL_PATH):
        print("Downloading pose model...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("Model downloaded.")

# ── Landmark indices ──────────────────────────────────────────
POSE_LANDMARKS = {
    'nose': 0,
    'left_eye_inner': 1,
    'left_eye': 2,
    'left_eye_outer': 3,
    'right_eye_inner': 4,
    'right_eye': 5,
    'right_eye_outer': 6,
    'left_ear': 7,
    'right_ear': 8,
    'mouth_left': 9,
    'mouth_right': 10,
    'left_shoulder': 11,
    'right_shoulder': 12,
    'left_elbow': 13,
    'right_elbow': 14,
    'left_wrist': 15,
    'right_wrist': 16,
    'left_hip': 23,
    'right_hip': 24,
    'left_knee': 25,
    'right_knee': 26,
    'left_ankle': 27,
    'right_ankle': 28,
}

_landmarker = None
_frame_ts = 0

def _get_landmarker():
    global _landmarker
    if _landmarker is None:
        _ensure_model()
        base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.VIDEO,
            min_pose_detection_confidence=0.7,
            min_pose_presence_confidence=0.7,
            min_tracking_confidence=0.7,
        )
        _landmarker = vision.PoseLandmarker.create_from_options(options)
    return _landmarker


def detect_pose(frame):
    global _frame_ts
    landmarker = _get_landmarker()
    h, w, _ = frame.shape

    # Convert to MediaPipe Image
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    # Increment timestamp (must be monotonically increasing in ms)
    _frame_ts += 100
    result = landmarker.detect_for_video(mp_image, _frame_ts)

    keypoints = {}
    if result.pose_landmarks:
        lms = result.pose_landmarks[0]  # first person
        for name, idx in POSE_LANDMARKS.items():
            if idx < len(lms):
                lm = lms[idx]
                if lm.visibility > 0.7:
                    keypoints[name] = (int(lm.x * w), int(lm.y * h))
                else:
                    keypoints[name] = None
            else:
                keypoints[name] = None
    else:
        for name in POSE_LANDMARKS:
            keypoints[name] = None

    return keypoints


def analyze_posture(keypoints, reference_keypoints=None):
    if reference_keypoints is None:
        return None
    dists = []
    for k in keypoints:
        if k in reference_keypoints and keypoints[k] is not None and reference_keypoints[k] is not None:
            dists.append(np.linalg.norm(np.array(keypoints[k]) - np.array(reference_keypoints[k])))
    return np.mean(dists) if dists else float('inf')