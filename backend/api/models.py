from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


# --- Test run schemas ---

class TestRunRequest(BaseModel):
    game: Literal["tictactoe"]
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
    is_draw: bool
    reason: str
    turn: int
    board: list
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
    game: Literal["tictactoe"]
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


# --- Auth schemas ---

class SignupRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    id: str
    email: str
    created_at: datetime
