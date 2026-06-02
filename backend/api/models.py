from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


class MatchRequest(BaseModel):
    game: Literal["tictactoe"]
    code: str
    lang: Literal["python", "javascript", "java", "cpp"]
    opponent: Literal["easy", "medium", "hard"] = "easy"


class MatchSummary(BaseModel):
    match_id: str
    status: str
    game: str
    lang: str
    submitted_at: datetime


class MatchResultSchema(BaseModel):
    winner_player: Optional[int]
    loser_player: Optional[int]
    is_draw: bool
    reason: str
    turn: int
    board: list
    bot_logs: list[str]


class MatchResponse(BaseModel):
    match_id: str
    status: str
    game: str
    result: Optional[MatchResultSchema] = None
    error: Optional[str] = None


class CodeResponse(BaseModel):
    match_id: str
    lang: str
    code: str


# Auth schemas

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
