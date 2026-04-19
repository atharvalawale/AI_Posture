"""
scoring.py
Auto-detects front vs side view and adjusts thresholds accordingly.
"""

from dataclasses import dataclass
from typing import Optional
import time
from collections import deque

from ai_engine.exercise.physio_exercises import (
    KneeExtension,
    ShoulderRaises,
    StraightLegRaise,
    detect_view,
    get_exercise,
)


@dataclass
class FrameResult:
    exercise_name: str
    stage: str
    rep_count: int
    last_rep_score: Optional[float]
    session_avg_score: Optional[float]
    feedback: str
    severity: str
    angle: Optional[float]
    angle2: Optional[float]
    hold_progress: float
    reps_target: int
    view: str   # "front" or "side" — useful for UI to show patient


class ExerciseScorer:
    def __init__(self, exercise_cls, side: str = "left", reps_target: int = 10):
        self.ex = exercise_cls
        self.side = side
        self.reps_target = reps_target

        self._stage = "waiting"
        self._rep_count = 0
        self._hold_frames = 0
        self._rep_scores: list[float] = []
        self._current_rep_angles: list[float] = []
        self._peak_angle: Optional[float] = None
        self._start_angle: Optional[float] = None

        # View detection — lock after 15 frames so it doesn't flip mid-session
        self._view_buffer = deque(maxlen=15)
        self._current_view = "front"
        self._view_locked = False    # once locked, never changes

        # Angle smoothing
        self._angle_buffer = deque(maxlen=5)

        # Active config (updated when view changes)
        self._config = ShoulderRaises.get_config("front") if exercise_cls is ShoulderRaises else {}

    def update(self, keypoints: dict) -> FrameResult:
        # Update view detection
        detected = detect_view(keypoints)
        self._view_buffer.append(detected)
        # Only switch view if 7/10 recent frames agree — prevents flipping
        front_count = self._view_buffer.count("front")
        new_view = "front" if front_count >= 7 else "side"
        if new_view != self._current_view:
            self._current_view = new_view
            if self.ex is ShoulderRaises:
                self._config = ShoulderRaises.get_config(new_view)
                # Reset state when view changes to avoid bad reps
                self._stage = "waiting"
                self._angle_buffer.clear()

        raw_angle, angle2 = self._get_angles(keypoints)

        if raw_angle is not None:
            self._angle_buffer.append(raw_angle)
            angle = sum(self._angle_buffer) / len(self._angle_buffer)
        else:
            self._angle_buffer.clear()
            angle = None

        self._advance_state(angle, angle2)
        feedback, severity = self._get_feedback(angle, angle2)

        score = self._rep_scores[-1] if self._rep_scores else None
        avg   = round(sum(self._rep_scores) / len(self._rep_scores), 1) if self._rep_scores else None
        hold_progress = min(self._hold_frames / max(self.ex.HOLD_FRAMES, 1), 1.0)

        return FrameResult(
            exercise_name=self.ex.name,
            stage=self._stage,
            rep_count=self._rep_count,
            last_rep_score=score,
            session_avg_score=avg,
            feedback=feedback,
            severity=severity,
            angle=round(angle, 1) if angle is not None else None,
            angle2=round(angle2, 1) if angle2 is not None else None,
            hold_progress=hold_progress,
            reps_target=self.reps_target,
            view=self._current_view,
        )

    def reset(self):
        self.__init__(self.ex, self.side, self.reps_target)

    @property
    def is_complete(self) -> bool:
        return self._rep_count >= self.reps_target

    def _get_angles(self, keypoints):
        ex = self.ex
        angle2 = None
        if ex is KneeExtension:
            angle = ex.get_angle(keypoints, self.side)
        elif ex is ShoulderRaises:
            angle = ex.get_angle(keypoints, self.side)
        elif ex is StraightLegRaise:
            angle  = ex.get_leg_raise_angle(keypoints, self.side)
            angle2 = ex.get_knee_angle(keypoints, self.side)
        else:
            angle = None
        return angle, angle2

    def _get_thresholds(self):
        """Return thresholds based on exercise and current view."""
        ex = self.ex
        if ex is ShoulderRaises:
            return self._config
        # Knee and SLR same for both views
        return {
            "max_start_angle":  ex.MAX_START_ANGLE,
            "min_end_angle":    ex.MIN_END_ANGLE,
            "moving_threshold": ex.MOVING_THRESHOLD,
            "direction":        "increasing",
        }

    def _advance_state(self, angle, angle2):
        if angle is None:
            self._stage = "waiting"
            self._hold_frames = 0
            return

        t = self._get_thresholds()
        direction = t.get("direction", "increasing")

        if self._stage == "waiting":
            if self._at_start(angle, t):
                self._stage = "start"
                self._start_angle = angle
                self._current_rep_angles = []
                self._peak_angle = angle

        elif self._stage == "start":
            self._current_rep_angles.append(angle)
            if self._moving_toward_peak(angle, t):
                self._stage = "moving"

        elif self._stage == "moving":
            self._current_rep_angles.append(angle)
            if self._is_better_peak(angle, direction):
                self._peak_angle = angle
            if self._at_peak(angle, t):
                self._stage = "holding"
                self._hold_frames = 0
            elif self._returned_to_start(angle, t) and len(self._current_rep_angles) > 5:
                self._complete_rep(angle, penalise_hold=True)

        elif self._stage == "holding":
            self._current_rep_angles.append(angle)
            if self._is_better_peak(angle, direction):
                self._peak_angle = angle
            self._hold_frames += 1
            if self._hold_frames >= self.ex.HOLD_FRAMES:
                self._stage = "lowering"

        elif self._stage == "lowering":
            self._current_rep_angles.append(angle)
            if self._returned_to_start(angle, t):
                self._complete_rep(angle, penalise_hold=False)

    def _at_start(self, angle, t) -> bool:
        direction = t.get("direction", "increasing")
        if direction == "increasing":
            return angle <= t["max_start_angle"]
        else:  # side view — angle is high at rest
            return angle >= t["max_start_angle"]

    def _at_peak(self, angle, t) -> bool:
        direction = t.get("direction", "increasing")
        if direction == "increasing":
            return angle >= t["min_end_angle"]
        else:  # side view — angle is low at peak
            return angle <= t["min_end_angle"]

    def _returned_to_start(self, angle, t) -> bool:
        direction = t.get("direction", "increasing")
        if direction == "increasing":
            return angle <= t["max_start_angle"] + 15
        else:
            return angle >= t["max_start_angle"] - 15

    def _moving_toward_peak(self, angle, t) -> bool:
        if self._start_angle is None:
            return False
        direction = t.get("direction", "increasing")
        if direction == "increasing":
            return angle > self._start_angle + t["moving_threshold"]
        else:
            return angle < self._start_angle - t["moving_threshold"]

    def _is_better_peak(self, angle, direction) -> bool:
        if self._peak_angle is None:
            return True
        if direction == "increasing":
            return angle > self._peak_angle
        else:
            return angle < self._peak_angle

    def _calculate_score(self, penalise_hold: bool) -> float:
        ex = self.ex
        score = 0.0

        # ROM — 70 pts
        if self._peak_angle is not None and self._start_angle is not None:
            t = self._get_thresholds()
            required_range = abs(t.get("end_angle", ex.END_ANGLE) - t.get("start_angle", ex.START_ANGLE))
            achieved_range = abs(self._peak_angle - self._start_angle)
            rom_ratio = min(achieved_range / max(required_range, 1), 1.0)
            score += 70 * rom_ratio

        # Hold — 20 pts
        if not penalise_hold:
            hold_ratio = min(self._hold_frames / max(ex.HOLD_FRAMES, 1), 1.0)
            score += 20 * hold_ratio

        # Smoothness — 10 pts
        if len(self._current_rep_angles) >= 4:
            angles = self._current_rep_angles
            reversals = 0
            for i in range(1, len(angles) - 1):
                d1 = angles[i] - angles[i - 1]
                d2 = angles[i + 1] - angles[i]
                if d1 * d2 < 0:
                    reversals += 1
            max_reversals = max(len(angles) // 4, 2)
            smoothness = max(0, 1 - reversals / max_reversals)
            score += 10 * smoothness
        else:
            score += 10

        return round(min(score, 100.0), 1)

    def _complete_rep(self, angle, penalise_hold=False):
        score = self._calculate_score(penalise_hold)
        self._rep_scores.append(score)
        self._rep_count += 1
        self._stage = "start" if not self.is_complete else "complete"
        self._hold_frames = 0
        self._current_rep_angles = []
        self._peak_angle = None
        self._start_angle = angle

    def _get_feedback(self, angle, angle2) -> tuple[str, str]:
        ex = self.ex
        stage = self._stage
        view = self._current_view

        if stage == "complete":
            avg = sum(self._rep_scores) / len(self._rep_scores) if self._rep_scores else 0
            return f"Session complete! Average score: {avg:.0f}/100", "good"

        if stage == "waiting":
            return "Get into starting position — ensure your full body is visible.", "warning"

        if ex is KneeExtension:
            mapped = {"start": "start", "moving": "extending",
                      "holding": "holding", "lowering": "lowering"}.get(stage, "start")
            return ex.get_feedback(angle, mapped, self.side)

        if ex is ShoulderRaises:
            mapped = {"start": "start", "moving": "raising",
                      "holding": "holding", "lowering": "lowering"}.get(stage, "start")
            return ex.get_feedback(angle, mapped, self.side, view)

        if ex is StraightLegRaise:
            mapped = {"start": "start", "moving": "raising",
                      "holding": "holding", "lowering": "lowering"}.get(stage, "start")
            return ex.get_feedback(angle, angle2, mapped, self.side)

        return "Follow the exercise instructions.", "good"


def session_summary(scorer: ExerciseScorer) -> dict:
    scores = scorer._rep_scores
    return {
        "exercise": scorer.ex.name,
        "side": scorer.side,
        "view": scorer._current_view,
        "reps_completed": scorer._rep_count,
        "reps_target": scorer.reps_target,
        "scores": scores,
        "avg_score": round(sum(scores) / len(scores), 1) if scores else 0,
        "min_score": round(min(scores), 1) if scores else 0,
        "max_score": round(max(scores), 1) if scores else 0,
        "completion_pct": round(scorer._rep_count / scorer.reps_target * 100, 1),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }