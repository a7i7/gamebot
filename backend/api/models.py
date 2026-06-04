import re
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, field_validator

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,30}$")


# --- Test run schemas ---

class TestRunRequest(BaseModel):
    game: Literal["tictactoe", "ludo"]
    code: str
    lang: Literal["python", "javascript", "java", "cpp"]
    opponent: Literal["easy", "medium", "hard"] = "easy"


class TestRunSummary(BaseModel):
    match_id: str
    status: str
    game: str
    lang: str
    opponent: Optional[str]
    submitted_at: datetime


class MatchResultSchema(BaseModel):
    winner_player: Optional[int]
    loser_player: Optional[int]
    user_player: Optional[int]
    is_draw: bool
    reason: str
    turn: int
    board: list | dict  # TicTacToe: 2D grid. Ludo: {"tokens": [...], "dice": int}.
    bot_logs: list[str]


class TestRunResponse(BaseModel):
    match_id: str
    status: str
    game: str
    result: Optional[MatchResultSchema] = None
    error: Optional[str] = None


class CodeResponse(BaseModel):
    match_id: str
    lang: str
    code: str


# --- Scored submission schemas ---

class SubmissionRequest(BaseModel):
    game: Literal["tictactoe", "ludo"]
    code: str
    lang: Literal["python", "javascript", "java", "cpp"]


class SubmissionSummary(BaseModel):
    submission_id: str
    status: str
    game: str
    lang: str
    score: Optional[float]
    matches_completed: int
    total_matches: int
    created_at: datetime


class SubmissionMatchDetail(BaseModel):
    match_id: str
    opponent: Optional[str]
    status: str
    winner_player: Optional[int]
    is_draw: Optional[bool]
    reason: Optional[str]
    points_earned: Optional[float]


class SubmissionResponse(BaseModel):
    submission_id: str
    status: str
    game: str
    lang: str
    score: Optional[float]
    wins: int
    draws: int
    losses: int
    matches_completed: int
    total_matches: int
    matches: list[SubmissionMatchDetail]
    created_at: datetime
    completed_at: Optional[datetime]


# --- Leaderboard schemas ---

class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    score: float
    wins: int
    draws: int
    losses: int


# --- Auth schemas ---

class SignupRequest(BaseModel):
    email: str
    username: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        normalized = v.strip().lower()
        if not _EMAIL_RE.match(normalized):
            raise ValueError("Enter a valid email address")
        return normalized

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if not _USERNAME_RE.match(v):
            raise ValueError(
                "Username must be 3–30 characters and contain only letters, numbers, or underscores"
            )
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    identifier: str  # email or username
    password: str

    @field_validator("identifier")
    @classmethod
    def validate_identifier(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Email or username is required")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    id: str
    email: str
    username: str
    created_at: datetime
