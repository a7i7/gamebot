import asyncio
import uuid

from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env.local")  # backend/.env.local

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from api.models import (
    CodeResponse,
    MatchRequest,
    MatchResponse,
    MatchResultSchema,
    MatchSummary,
)
from api.routers import auth as auth_router
from auth.deps import get_current_user
from db.engine import engine, get_session
from db.models import Base, User
from db.repos import matches as matches_repo
from db.repos import submissions as submissions_repo
from . import runner

app = FastAPI(title="Gamebot Referee API")

# Limit concurrent match execution to 5 to prevent CPU/resource contention
match_semaphore = asyncio.Semaphore(5)


@app.on_event("startup")
async def create_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/auth", tags=["auth"])


def _to_match_response(match, submission) -> MatchResponse:
    result_schema = None
    if match.status == "completed" and match.final_board is not None:
        result_schema = MatchResultSchema(
            winner_player=match.winner_player,
            loser_player=_loser(match.winner_player),
            is_draw=match.is_draw or False,
            reason=match.reason or "",
            turn=match.turns or 0,
            board=match.final_board,
            bot_logs=match.bot_logs or [],
        )
    return MatchResponse(
        match_id=str(match.id),
        status=match.status,
        game=match.game,
        result=result_schema,
        error=match.error,
    )


def _loser(winner: int | None) -> int | None:
    if winner == 1:
        return 2
    if winner == 2:
        return 1
    return None


async def _run_match_with_semaphore(match_id: uuid.UUID, game: str, submission_id: uuid.UUID, code: str, lang: str, opponent: str) -> None:
    async with match_semaphore:
        await runner.run_match(match_id, game, submission_id, code, lang, opponent)


@app.post("/matches", status_code=202)
async def create_match(
    req: MatchRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    submission = await submissions_repo.create_submission(
        session,
        user_id=current_user.id,
        game=req.game,
        lang=req.lang,
        code=req.code,
    )
    match = await matches_repo.create_match(session, game=req.game, player1_submission_id=submission.id)
    asyncio.create_task(
        _run_match_with_semaphore(match.id, req.game, submission.id, req.code, req.lang, req.opponent)
    )
    return {"match_id": str(match.id)}


@app.get("/matches", response_model=list[MatchSummary])
async def list_matches(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[MatchSummary]:
    matches = await matches_repo.list_for_user(session, current_user.id)
    return [
        MatchSummary(
            match_id=str(m.id),
            status=m.status,
            game=m.game,
            lang=m.player1_submission.lang,
            submitted_at=m.created_at,
        )
        for m in matches
    ]


@app.get("/matches/{match_id}", response_model=MatchResponse)
async def get_match(
    match_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MatchResponse:
    try:
        mid = uuid.UUID(match_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Match not found")

    match = await matches_repo.get_match(session, mid)
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.player1_submission.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return _to_match_response(match, match.player1_submission)


@app.get("/matches/{match_id}/code", response_model=CodeResponse)
async def get_code(
    match_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> CodeResponse:
    try:
        mid = uuid.UUID(match_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Match not found")

    match = await matches_repo.get_match(session, mid)
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.player1_submission.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    sub = match.player1_submission
    return CodeResponse(match_id=str(match.id), lang=sub.lang, code=sub.code)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
