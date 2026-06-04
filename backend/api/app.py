import asyncio
import os
import time
import uuid

from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env.local")  # backend/.env.local

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from api.models import (
    CodeResponse,
    LeaderboardEntry,
    SubmissionRequest,
    SubmissionResponse,
    SubmissionSummary,
    SubmissionMatchDetail,
    TestRunRequest,
    TestRunResponse,
    TestRunSummary,
    MatchResultSchema,
)
from api.routers import auth as auth_router
from auth.deps import get_current_user
from db.engine import engine, get_session
from db.models import Base, User
from db.repos import matches as matches_repo
from db.repos import scored_submissions as scored_submissions_repo
from db.repos import submissions as submissions_repo
from . import runner

app = FastAPI(title="Gamebot Referee API")

# Limit concurrent match execution to 5 to prevent CPU/resource contention
match_semaphore = asyncio.Semaphore(5)

# Per-user rate limiting — configurable via RATE_LIMIT_SECONDS env var
RATE_LIMIT_SECONDS = int(os.environ.get("RATE_LIMIT_SECONDS", "1"))
_test_run_last: dict[str, float] = {}
_submission_last: dict[str, float] = {}


def _check_rate_limit(store: dict[str, float], user_id) -> None:
    key = str(user_id)
    now = time.monotonic()
    last = store.get(key)
    if last is not None:
        elapsed = now - last
        if elapsed < RATE_LIMIT_SECONDS:
            remaining = int(RATE_LIMIT_SECONDS - elapsed) + 1
            s = "s" if remaining != 1 else ""
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {remaining} second{s} before trying again",
            )
    store[key] = now


@app.on_event("startup")
async def create_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

import os as _os
_allowed_origins = _os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/auth", tags=["auth"])


def _loser(winner: int | None) -> int | None:
    if winner == 1:
        return 2
    if winner == 2:
        return 1
    return None


def _to_test_run_response(match) -> TestRunResponse:
    result_schema = None
    if match.status == "completed" and match.final_board is not None:
        result_schema = MatchResultSchema(
            winner_player=match.winner_player,
            loser_player=_loser(match.winner_player),
            user_player=match.user_player,
            is_draw=match.is_draw or False,
            reason=match.reason or "",
            turn=match.turns or 0,
            board=match.final_board,
            bot_logs=match.bot_logs or [],
        )
    return TestRunResponse(
        match_id=str(match.id),
        status=match.status,
        game=match.game,
        result=result_schema,
        error=match.error,
    )


async def _run_match_with_semaphore(
    match_id: uuid.UUID, game: str, submission_id: uuid.UUID,
    code: str, lang: str, opponent: str,
) -> None:
    async with match_semaphore:
        await runner.run_match(match_id, game, submission_id, code, lang, opponent)


async def _run_scored_submission_with_semaphore(
    scored_submission_id: uuid.UUID, game: str, submission_id: uuid.UUID,
    code: str, lang: str,
) -> None:
    async with match_semaphore:
        await runner.run_scored_submission(scored_submission_id, game, submission_id, code, lang)


# --- Test run endpoints ---

@app.post("/test-runs", status_code=202)
async def create_test_run(
    req: TestRunRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    _check_rate_limit(_test_run_last, current_user.id)
    submission = await submissions_repo.create_submission(
        session,
        user_id=current_user.id,
        game=req.game,
        lang=req.lang,
        code=req.code,
    )
    match = await matches_repo.create_match(
        session,
        game=req.game,
        player1_submission_id=submission.id,
        opponent=req.opponent,
    )
    asyncio.create_task(
        _run_match_with_semaphore(match.id, req.game, submission.id, req.code, req.lang, req.opponent)
    )
    return {"match_id": str(match.id)}


@app.get("/test-runs", response_model=list[TestRunSummary])
async def list_test_runs(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[TestRunSummary]:
    matches = await matches_repo.list_for_user(session, current_user.id)
    return [
        TestRunSummary(
            match_id=str(m.id),
            status=m.status,
            game=m.game,
            lang=m.player1_submission.lang,
            opponent=m.opponent,
            submitted_at=m.created_at,
        )
        for m in matches
        if m.scored_submission_id is None
    ]


@app.get("/test-runs/{match_id}", response_model=TestRunResponse)
async def get_test_run(
    match_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> TestRunResponse:
    try:
        mid = uuid.UUID(match_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Match not found")

    match = await matches_repo.get_match(session, mid)
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.player1_submission.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return _to_test_run_response(match)


@app.get("/test-runs/{match_id}/code", response_model=CodeResponse)
async def get_test_run_code(
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


# --- Scored submission endpoints ---

@app.post("/submissions", status_code=202)
async def create_submission(
    req: SubmissionRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    _check_rate_limit(_submission_last, current_user.id)
    submission = await submissions_repo.create_submission(
        session,
        user_id=current_user.id,
        game=req.game,
        lang=req.lang,
        code=req.code,
    )
    scored = await scored_submissions_repo.create_scored_submission(
        session,
        submission_id=submission.id,
        game=req.game,
    )
    asyncio.create_task(
        _run_scored_submission_with_semaphore(scored.id, req.game, submission.id, req.code, req.lang)
    )
    return {"submission_id": str(scored.id)}


@app.get("/submissions", response_model=list[SubmissionSummary])
async def list_submissions(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[SubmissionSummary]:
    scored_list = await scored_submissions_repo.list_for_user(session, current_user.id)
    return [
        SubmissionSummary(
            submission_id=str(s.id),
            status=s.status,
            game=s.game,
            lang=s.submission.lang,
            score=s.score,
            matches_completed=s.matches_completed,
            total_matches=s.total_matches,
            created_at=s.created_at,
        )
        for s in scored_list
    ]


@app.get("/submissions/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SubmissionResponse:
    try:
        sid = uuid.UUID(submission_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Submission not found")

    scored = await scored_submissions_repo.get_scored_submission(session, sid)
    if scored is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    if scored.submission.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    match_details = [
        SubmissionMatchDetail(
            match_id=str(m.id),
            opponent=m.opponent,
            status=m.status,
            winner_player=m.winner_player,
            is_draw=m.is_draw,
            reason=m.reason,
            points_earned=m.points_earned,
        )
        for m in scored.matches
    ]

    return SubmissionResponse(
        submission_id=str(scored.id),
        status=scored.status,
        game=scored.game,
        lang=scored.submission.lang,
        score=scored.score,
        wins=scored.wins,
        draws=scored.draws,
        losses=scored.losses,
        matches_completed=scored.matches_completed,
        total_matches=scored.total_matches,
        matches=match_details,
        created_at=scored.created_at,
        completed_at=scored.completed_at,
    )


@app.get("/leaderboards/{game}", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    game: str,
    session: AsyncSession = Depends(get_session),
) -> list[LeaderboardEntry]:
    entries = await scored_submissions_repo.get_leaderboard(session, game)
    return [
        LeaderboardEntry(
            rank=i + 1,
            username=row["username"],
            score=row["score"],
            wins=row["wins"],
            draws=row["draws"],
            losses=row["losses"],
        )
        for i, row in enumerate(entries)
    ]


@app.get("/health")
async def health() -> dict:
    return {"status": "ok_all"}
