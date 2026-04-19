from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_session
from app.schemas.pose_log import PoseLogCreate
from app.models.pose_log import PoseLog
from app.models.session import ExerciseSession, RepLog
from app.auth.dependencies import get_current_user
from app.auth.models import User

router = APIRouter()


# ── Existing route (untouched) ────────────────────────────────

@router.post("/log_pose_event")
def log_pose_event(
    data: PoseLogCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    log = PoseLog(**data.dict())
    session.add(log)
    session.commit()
    return {"status": "success"}


# ── New session scoring routes ────────────────────────────────

class RepIn(BaseModel):
    rep_number: int
    score: float
    peak_angle: Optional[float] = None
    hold_frames: int = 0


class SessionIn(BaseModel):
    exercise: str
    side: str = "left"
    reps_target: int = 10
    reps_completed: int
    avg_score: float
    min_score: float
    max_score: float
    completed: bool
    reps: List[RepIn] = []


@router.post("/session")
def save_session(
    data: SessionIn,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Save a completed exercise session with all rep scores."""
    ex_session = ExerciseSession(
        user_email=current_user.email,
        exercise=data.exercise,
        side=data.side,
        reps_completed=data.reps_completed,
        reps_target=data.reps_target,
        avg_score=data.avg_score,
        min_score=data.min_score,
        max_score=data.max_score,
        completed=data.completed,
        ended_at=datetime.utcnow(),
    )
    db.add(ex_session)
    db.commit()
    db.refresh(ex_session)

    for rep in data.reps:
        db.add(RepLog(
            session_id=ex_session.id,
            rep_number=rep.rep_number,
            score=rep.score,
            peak_angle=rep.peak_angle,
            hold_frames=rep.hold_frames,
        ))
    db.commit()
    return {"status": "success", "session_id": ex_session.id}


@router.get("/sessions")
def get_my_sessions(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Fetch all sessions for the logged-in user."""
    sessions = db.exec(
        select(ExerciseSession)
        .where(ExerciseSession.user_email == current_user.email)
        .order_by(ExerciseSession.started_at.desc())
    ).all()
    return sessions


@router.get("/progress/{exercise}")
def get_progress(
    exercise: str,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Returns avg_score per session over time for one exercise."""
    sessions = db.exec(
        select(ExerciseSession)
        .where(ExerciseSession.user_email == current_user.email)
        .where(ExerciseSession.exercise == exercise)
        .where(ExerciseSession.completed == True)
        .order_by(ExerciseSession.started_at)
    ).all()
    return [
        {
            "session_id": s.id,
            "date": s.started_at.strftime("%Y-%m-%d"),
            "avg_score": s.avg_score,
            "reps_completed": s.reps_completed,
        }
        for s in sessions
    ]