"""
physio_exercises.py
Supports both front view and side view automatically.
Auto-detection based on shoulder width in frame.
"""

import math
import numpy as np


def calculate_angle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba = a - b
    bc = c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    angle = math.degrees(math.acos(np.clip(cosine, -1.0, 1.0)))
    return angle


def detect_view(keypoints):
    """
    Detect if patient is in front view or side view.
    
    Logic: measure horizontal distance between shoulders.
    - Front view: shoulders far apart (> 15% of frame width)
    - Side view:  shoulders close together (one behind other)
    
    Returns: "front" or "side"
    """
    ls = keypoints.get("left_shoulder")
    rs = keypoints.get("right_shoulder")
    if ls is None or rs is None:
        return "front"  # default
    
    shoulder_width = abs(ls[0] - rs[0])
    
    # Use hip width as reference to normalize across distances from camera
    lh = keypoints.get("left_hip")
    rh = keypoints.get("right_hip")
    if lh is not None and rh is not None:
        hip_width = abs(lh[0] - rh[0])
        # In side view shoulders are much narrower than hips
        if hip_width > 0 and shoulder_width < hip_width * 0.6:
            return "side"
    
    # Fallback: if shoulder width < 80px assume side view
    if shoulder_width < 80:
        return "side"
    
    return "front"


class KneeExtension:
    name = "Knee Extension"
    description = "Sit upright and slowly straighten your knee until your leg is fully extended."
    required_landmarks = ["left_hip", "left_knee", "left_ankle",
                          "right_hip", "right_knee", "right_ankle"]

    # Same from both views — knee angle is consistent
    START_ANGLE      = 100
    END_ANGLE        = 160
    HOLD_FRAMES      = 8
    MAX_START_ANGLE  = 115
    MIN_END_ANGLE    = 150
    MOVING_THRESHOLD = 15

    @staticmethod
    def get_angle(keypoints, side="left"):
        hip   = keypoints.get(f"{side}_hip")
        knee  = keypoints.get(f"{side}_knee")
        ankle = keypoints.get(f"{side}_ankle")
        if hip is None or knee is None or ankle is None:
            return None
        return calculate_angle(hip, knee, ankle)

    @staticmethod
    def get_feedback(angle, stage, side="left"):
        if angle is None:
            return f"Cannot detect {side} leg. Ensure it is visible.", "error"
        if stage == "start":
            if angle > 120:
                return "Bend your knee more before starting.", "warning"
            return "Good start position. Now extend your knee.", "good"
        if stage == "extending":
            if angle < 130:
                return "Keep extending — you are halfway there.", "warning"
            if angle < 150:
                return "Almost there — push a little further.", "warning"
            return "Great extension! Hold for a moment.", "good"
        if stage == "holding":
            return "Hold — keep it straight.", "good"
        return "Return slowly to start position.", "good"


class ShoulderRaises:
    name = "Shoulder Raises"
    description = "Stand facing or side-on to the camera. Slowly raise your arm to shoulder height, then lower it."
    required_landmarks = ["left_shoulder", "left_elbow", "left_hip",
                          "right_shoulder", "right_elbow", "right_hip"]

    HOLD_FRAMES = 6

    # ── Front view calibration (arm increases from ~22° to ~102°)
    FRONT_START_ANGLE      = 22
    FRONT_END_ANGLE        = 102
    FRONT_MAX_START_ANGLE  = 45    # below this = resting
    FRONT_MIN_END_ANGLE    = 85    # above this = fully raised
    FRONT_MOVING_THRESHOLD = 25    # must move 25° to count as moving

    # ── Side view calibration (arm decreases from ~175° to ~90°)
    SIDE_START_ANGLE       = 175
    SIDE_END_ANGLE         = 90
    SIDE_MAX_START_ANGLE   = 155   # above this = resting (high angle)
    SIDE_MIN_END_ANGLE     = 100   # below this = fully raised (low angle)
    SIDE_MOVING_THRESHOLD  = 25    # must move 25° to count as moving

    # Active config (set dynamically based on detected view)
    START_ANGLE      = FRONT_START_ANGLE
    END_ANGLE        = FRONT_END_ANGLE
    MAX_START_ANGLE  = FRONT_MAX_START_ANGLE
    MIN_END_ANGLE    = FRONT_MIN_END_ANGLE
    MOVING_THRESHOLD = FRONT_MOVING_THRESHOLD

    @staticmethod
    def get_angle(keypoints, side="left"):
        shoulder = keypoints.get(f"{side}_shoulder")
        elbow    = keypoints.get(f"{side}_elbow")
        hip      = keypoints.get(f"{side}_hip")
        if shoulder is None or elbow is None or hip is None:
            return None
        return calculate_angle(elbow, shoulder, hip)

    @staticmethod
    def get_config(view="front"):
        """Return thresholds based on detected view."""
        if view == "side":
            return {
                "start_angle":      ShoulderRaises.SIDE_START_ANGLE,
                "end_angle":        ShoulderRaises.SIDE_END_ANGLE,
                "max_start_angle":  ShoulderRaises.SIDE_MAX_START_ANGLE,
                "min_end_angle":    ShoulderRaises.SIDE_MIN_END_ANGLE,
                "moving_threshold": ShoulderRaises.SIDE_MOVING_THRESHOLD,
                "direction":        "decreasing",  # angle goes DOWN when raising
            }
        return {
            "start_angle":      ShoulderRaises.FRONT_START_ANGLE,
            "end_angle":        ShoulderRaises.FRONT_END_ANGLE,
            "max_start_angle":  ShoulderRaises.FRONT_MAX_START_ANGLE,
            "min_end_angle":    ShoulderRaises.FRONT_MIN_END_ANGLE,
            "moving_threshold": ShoulderRaises.FRONT_MOVING_THRESHOLD,
            "direction":        "increasing",  # angle goes UP when raising
        }

    @staticmethod
    def get_feedback(angle, stage, side="left", view="front"):
        if angle is None:
            return f"Cannot detect {side} arm. Ensure elbow and shoulder are visible.", "error"
        if stage == "start":
            if view == "front" and angle > 45:
                return "Lower your arm to your side first.", "warning"
            if view == "side" and angle < 150:
                return "Lower your arm to your side first.", "warning"
            return "Good. Now slowly raise your arm out to the side.", "good"
        if stage == "raising":
            if view == "front":
                if angle < 55:
                    return "Keep raising — lift your arm higher.", "warning"
                if angle < 85:
                    return "Almost at shoulder height — a little more.", "warning"
            else:  # side
                if angle > 130:
                    return "Keep raising — lift your arm higher.", "warning"
                if angle > 105:
                    return "Almost at shoulder height — a little more.", "warning"
            return "Perfect height! Hold steady.", "good"
        if stage == "holding":
            return "Hold your arm at shoulder height.", "good"
        return "Slowly lower your arm back down.", "good"


class StraightLegRaise:
    name = "Straight Leg Raise"
    description = "Lie flat on your back. Keep your knee straight and raise your leg to about 45 degrees, then lower slowly."
    required_landmarks = ["left_shoulder", "left_hip", "left_knee", "left_ankle",
                          "right_shoulder", "right_hip", "right_knee", "right_ankle"]

    START_ANGLE      = 10
    END_ANGLE        = 45
    HOLD_FRAMES      = 8
    MAX_START_ANGLE  = 20
    MIN_END_ANGLE    = 30
    MAX_KNEE_BEND    = 25
    MOVING_THRESHOLD = 10

    @staticmethod
    def get_leg_raise_angle(keypoints, side="left"):
        hip   = keypoints.get(f"{side}_hip")
        ankle = keypoints.get(f"{side}_ankle")
        if hip is None or ankle is None:
            return None
        vec = np.array(ankle) - np.array(hip)
        angle = math.degrees(math.atan2(-vec[1], abs(vec[0]) + 1e-6))
        return angle

    @staticmethod
    def get_knee_angle(keypoints, side="left"):
        hip   = keypoints.get(f"{side}_hip")
        knee  = keypoints.get(f"{side}_knee")
        ankle = keypoints.get(f"{side}_ankle")
        if hip is None or knee is None or ankle is None:
            return None
        return calculate_angle(hip, knee, ankle)

    @staticmethod
    def get_feedback(leg_angle, knee_angle, stage, side="left"):
        if leg_angle is None:
            return f"Cannot detect {side} leg. Ensure full body is visible.", "error"
        if knee_angle is not None and knee_angle < (180 - StraightLegRaise.MAX_KNEE_BEND):
            return "Keep your knee straight — do not bend it.", "error"
        if stage == "start":
            if leg_angle > 25:
                return "Lower your leg flat to the floor first.", "warning"
            return "Good. Now slowly raise your straight leg.", "good"
        if stage == "raising":
            if leg_angle < 20:
                return "Keep lifting — raise to about 45 degrees.", "warning"
            if leg_angle < StraightLegRaise.MIN_END_ANGLE:
                return "A little higher — aim for 45 degrees.", "warning"
            return "Great height! Hold it there.", "good"
        if stage == "holding":
            return "Hold steady — keep that knee straight.", "good"
        return "Slowly lower your leg back to the floor.", "good"


EXERCISES = {
    "knee_extension":     KneeExtension,
    "shoulder_raises":    ShoulderRaises,
    "straight_leg_raise": StraightLegRaise,
}


def get_exercise(name: str):
    if name not in EXERCISES:
        raise KeyError(f"Unknown exercise '{name}'. Available: {list(EXERCISES.keys())}")
    return EXERCISES[name]