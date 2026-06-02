import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from db.models import Match, Submission


async def create_match(
    session: AsyncSession,
    game: str,
    player1_submission_id: uuid.UUID,
    opponent: str | None = None,
    scored_submission_id: uuid.UUID | None = None,
) -> Match:
    match = Match(
        game=game,
        player1_submission_id=player1_submission_id,
        opponent=opponent,
        scored_submission_id=scored_submission_id,
    )
    session.add(match)
    await session.commit()
    await session.refresh(match)
    return match


async def get_match(session: AsyncSession, match_id: uuid.UUID) -> Match | None:
    result = await session.execute(
        select(Match)
        .options(joinedload(Match.player1_submission))
        .where(Match.id == match_id)
    )
    return result.scalar_one_or_none()


async def update_status(session: AsyncSession, match_id: uuid.UUID, status: str) -> None:
    match = await session.get(Match, match_id)
    if match:
        match.status = status
        await session.commit()


async def update_match_result(
    session: AsyncSession,
    match_id: uuid.UUID,
    *,
    status: str,
    winner_player: int | None = None,
    is_draw: bool | None = None,
    reason: str | None = None,
    turns: int | None = None,
    final_board: list | None = None,
    bot_logs: list | None = None,
    error: str | None = None,
    points_earned: float | None = None,
) -> None:
    match = await session.get(Match, match_id)
    if not match:
        return
    match.status = status
    match.winner_player = winner_player
    match.is_draw = is_draw
    match.reason = reason
    match.turns = turns
    match.final_board = final_board
    match.bot_logs = bot_logs
    match.error = error
    match.points_earned = points_earned
    match.completed_at = datetime.now(timezone.utc)
    await session.commit()


async def list_for_scored_submission(
    session: AsyncSession,
    scored_submission_id: uuid.UUID,
) -> list[Match]:
    result = await session.execute(
        select(Match).where(Match.scored_submission_id == scored_submission_id)
    )
    return list(result.scalars().all())


async def list_for_user(session: AsyncSession, user_id: uuid.UUID) -> list[Match]:
    result = await session.execute(
        select(Match)
        .join(Submission, Match.player1_submission_id == Submission.id)
        .options(joinedload(Match.player1_submission))
        .where(Submission.user_id == user_id)
        .order_by(Match.created_at.desc())
    )
    return list(result.scalars().all())
