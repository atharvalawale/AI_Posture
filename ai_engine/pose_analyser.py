"""
pose_analyser.py
Uses mediapipe-model-maker free approach — works on headless servers.
Falls back to returning empty keypoints if GPU libs missing.
"""
import cv2
import math
import numpy as np
import os

# Set environment to avoid OpenGL issues on headless servers
os.environ["MEDIAPIPE_DISABLE_GPU"] = "1"
os.environ["MESA_GL_VERSION_OVERRIDE"] = "3.3"

import mediapipe as mp

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

_pose_instance = None

def _get_pose():
    global _pose_instance
    if _pose_instance is None:
        _pose_instance = mp.solutions.pose.Pose(
            static_image_mode=False,
            model_complexity=0,  # lightest model
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
    return _pose_instance


def detect_pose(frame):
    return detect_pose_with_landmarks(frame)[0]


def detect_pose_with_landmarks(frame):
    """
    Returns (keypoints, landmarks). `keypoints` is exactly what detect_pose returns: pixel
    coordinates per named landmark, None below 0.5 visibility. `landmarks` is every MediaPipe
    landmark (33, by MediaPipe index) as [x, y, visibility], x and y normalized 0..1 to the frame
    and rounded to 3 decimals, for drawing the skeleton on the client. It is None when no person
    is found or detection fails.
    """
    try:
        pose = _get_pose()
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb)
        h, w, _ = frame.shape
        keypoints = {}
        landmarks = None
        if results.pose_landmarks:
            for name, idx in POSE_LANDMARKS.items():
                lm = results.pose_landmarks.landmark[idx]
                if lm.visibility > 0.5:
                    keypoints[name] = (int(lm.x * w), int(lm.y * h))
                else:
                    keypoints[name] = None
            landmarks = compact_landmarks(results.pose_landmarks.landmark)
        else:
            for name in POSE_LANDMARKS:
                keypoints[name] = None
        return keypoints, landmarks
    except Exception as e:
        print(f"detect_pose error: {e}")
        return {name: None for name in POSE_LANDMARKS}, None


def compact_landmarks(landmarks):
    """[x, y, visibility] per landmark, rounded to 3 decimals so each frame's JSON stays small."""
    return [[round(lm.x, 3), round(lm.y, 3), round(lm.visibility, 3)] for lm in landmarks]


def analyze_posture(keypoints, reference_keypoints=None):
    if reference_keypoints is None:
        return None
    dists = []
    for k in keypoints:
        if k in reference_keypoints and keypoints[k] is not None and reference_keypoints[k] is not None:
            dists.append(np.linalg.norm(np.array(keypoints[k]) - np.array(reference_keypoints[k])))
    return np.mean(dists) if dists else float('inf')