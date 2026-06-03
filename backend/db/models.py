import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, SmallInteger, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    username: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)

    submissions: Mapped[list["Submission"]] = relationship("Submission", back_populates="user", lazy="select")


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (
        Index("idx_submissions_user_game", "user_id", "game", "submitted_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    game: Mapped[str] = mapped_column(Text, nullable=False)
    lang: Mapped[str] = mapped_column(Text, nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)

    user: Mapped["User"] = relationship("User", back_populates="submissions")
    matches_as_p1: Mapped[list["Match"]] = relationship("Match", foreign_keys="Match.player1_submission_id", back_populates="player1_submission", lazy="select")
    scored_submissions: Mapped[list["ScoredSubmission"]] = relationship("ScoredSubmission", back_populates="submission", lazy="select")


class ScoredSubmission(Base):
    __tablename__ = "scored_submissions"
    __table_args__ = (
        CheckConstraint("status IN ('pending','running','completed','failed')", name="chk_scored_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("submissions.id"), nullable=False)
    game: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="pending")
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    draws: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    losses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    matches_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_matches: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    submission: Mapped["Submission"] = relationship("Submission", back_populates="scored_submissions")
    matches: Mapped[list["Match"]] = relationship("Match", back_populates="scored_submission", lazy="select")


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        CheckConstraint("status IN ('pending','running','completed','failed')", name="chk_status"),
        Index("idx_matches_p1", "player1_submission_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game: Mapped[str] = mapped_column(Text, nullable=False)
    player1_submission_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("submissions.id"), nullable=False)
    player2_submission_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("submissions.id"), nullable=True)
    scored_submission_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("scored_submissions.id"), nullable=True)
    opponent: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="pending")
    winner_player: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    user_player: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    is_draw: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    turns: Mapped[int | None] = mapped_column(Integer, nullable=True)
    final_board: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    bot_logs: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    player1_submission: Mapped["Submission"] = relationship("Submission", foreign_keys=[player1_submission_id], back_populates="matches_as_p1")
    points_earned: Mapped[float | None] = mapped_column(Float, nullable=True)

    scored_submission: Mapped["ScoredSubmission | None"] = relationship("ScoredSubmission", back_populates="matches")
