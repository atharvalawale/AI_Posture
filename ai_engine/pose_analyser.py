import cv2
import math
import numpy as np

# Support both old and new MediaPipe API
try:
    import mediapipe as mp
    # Try new API first (0.10.30+)
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision
    USE_NEW_API = True
except Exception:
    USE_NEW_API = False

if not USE_NEW_API:
    import mediapipe as mp


class HolisticAnalyzer:
    def __init__(self):
        import mediapipe as mp
        # Try old API (solutions)
        try:
            self.mp_pose = mp.solutions.pose
            self.mp_drawing = mp.solutions.drawing_utils
            self.pose = self.mp_pose.Pose(
                static_image_mode=False,
                model_complexity=1,
                enable_segmentation=False,
                min_detection_confidence=0.7,
                min_tracking_confidence=0.7,
            )
            self.use_solutions = True
        except AttributeError:
            # New API fallback
            self.use_solutions = False
            base_options = mp.tasks.BaseOptions(
                model_asset_path=None
            )
            options = mp.tasks.vision.PoseLandmarkerOptions(
                base_options=base_options,
                running_mode=mp.tasks.vision.RunningMode.VIDEO,
            )
            self.use_solutions = False

    def analyze(self, frame):
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        if self.use_solutions:
            results = self.pose.process(image_rgb)
            return results
        return None

    def release(self):
        if self.use_solutions and hasattr(self, 'pose'):
            self.pose.close()
        cv2.destroyAllWindows()


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

_analyzer_instance = None


def _get_analyzer():
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = HolisticAnalyzer()
    return _analyzer_instance


def detect_pose(frame):
    """
    Detect pose landmarks and return {name: (x, y) or None}.
    Only returns a landmark if visibility > 0.7.
    """
    analyzer = _get_analyzer()

    if not analyzer.use_solutions:
        # New MediaPipe API — return empty keypoints
        return {name: None for name in POSE_LANDMARKS}

    results = analyzer.analyze(frame)
    keypoints = {}
    h, w, _ = frame.shape

    if results and results.pose_landmarks:
        for name, idx in POSE_LANDMARKS.items():
            lm = results.pose_landmarks.landmark[idx]
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