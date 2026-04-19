from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime


class ExerciseSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_email: str = Field(index=True)   # links to User.email (no FK to avoid conflict)
    exercise: str
    side: str = Field(default="left")
    reps_completed: int = Field(default=0)
    reps_target: int = Field(default=10)
    avg_score: float = Field(default=0.0)
    min_score: float = Field(default=0.0)
    max_score: float = Field(default=0.0)
    completed: bool = Field(default=False)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None

    reps: List["RepLog"] = Relationship(back_populates="session")


class RepLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="exercisesession.id", index=True)
    rep_number: int
    score: float
    peak_angle: Optional[float] = None
    hold_frames: int = Field(default=0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    session: Optional[ExerciseSession] = Relationship(back_populates="reps")