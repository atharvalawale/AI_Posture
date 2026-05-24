import cv2
import math
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.components import containers
import urllib.request
import os

# Download the pose landmarker model if not present
MODEL_PATH = "pose_landmarker.task"
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task"

def _ensure_model():
    if not os.path.exists(MODEL_PATH):
        print(f"Downloading pose landmarker model...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("Model downloaded.")

class HolisticAnalyzer:
    def __init__(self):
        _ensure_model()
        base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            min_pose_detection_confidence=0.7,
            min_tracking_confidence=0.7,
            model_complexity=1,  # 0=lite, 1=full, 2=heavy
        )
        self.landmarker = vision.PoseLandmarker.create_from_options(options)

    def analyze(self, frame):
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
        return self.landmarker.detect(mp_image)

    def release(self):
        self.landmarker.close()
        cv2.destroyAllWindows()


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

_analyzer_instance = None


def _get_analyzer():
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = HolisticAnalyzer()
    return _analyzer_instance


def detect_pose(frame):
    analyzer = _get_analyzer()
    results = analyzer.analyze(frame)
    keypoints = {}
    h, w, _ = frame.shape

    if results and results.pose_landmarks:
        # New API returns a list of poses; take the first one
        landmarks = results.pose_landmarks[0]
        for name, idx in POSE_LANDMARKS.items():
            lm = landmarks[idx]
            if lm.visibility > 0.7:
                keypoints[name] = (int(lm.x * w), int(lm.y * h))
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