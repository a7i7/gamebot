import uuid
from datetime import datetime, timezone

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from db.models import Match, ScoredSubmission, Submission

# --- Per-game ranked-submission config (single source of truth) ---------------
# games_per_difficulty: how many matches vs each of easy/medium/hard.
# weights: points for a win vs that difficulty (a draw earns half, a loss 0).
# normalize: True  -> final score is earned/max * 100 (a perfect run = 100).
#            False -> final score is the raw sum of points earned (absolute).
DIFFICULTIES = ("easy", "medium", "hard")

SUBMISSION_CONFIG = {
    "tictactoe": {"games_per_difficulty": 5, "weights": {"easy": 5, "medium": 20.0, "hard": 50.0}, "normalize": True},
    "ludo":      {"games_per_difficulty": 2, "weights": {"easy": 30, "medium": 70, "hard": 100},   "normalize": False},
}
_DEFAULT = SUBMISSION_CONFIG["tictactoe"]


def _cfg(game: str) -> dict:
    return SUBMISSION_CONFIG.get(game, _DEFAULT)


def games_per_difficulty(game: str) -> int:
    return _cfg(game)["games_per_difficulty"]


def total_matches_for(game: str) -> int:
    return len(DIFFICULTIES) * games_per_difficulty(game)


def max_score_for(game: str) -> float:
    c = _cfg(game)
    return c["games_per_difficulty"] * sum(c["weights"].values())


def compute_match_points(game: str, opponent: str | None, winner_player: int | None, is_draw: bool | None) -> float:
    w = _cfg(game)["weights"].get(opponent or "", 1.0)
    if is_draw:
        return w * 0.5
    if winner_player == 1:
        return float(w)
    return 0.0


def compute_score(game: str, matches: list[Match]) -> tuple[float, int, int, int]:
    """Return (score, wins, draws, losses) from a list of completed matches.

    The score is normalized to 0-100 or an absolute sum, per the game's config.
    """
    wins = draws = losses = 0
    earned = 0.0
    for m in matches:
        if m.status != "completed":
            continue
        earned += m.points_earned or 0.0
        if m.is_draw:
            draws += 1
        elif m.winner_player == 1:
            wins += 1
        else:
            losses += 1
    if _cfg(game)["normalize"]:
        max_score = max_score_for(game)
        score = (earned / max_score) * 100 if max_score > 0 else 0.0
    else:
        score = earned
    return round(score, 2), wins, draws, losses


async def create_scored_submission(
    session: AsyncSession,
    submission_id: uuid.UUID,
    game: str,
    total_matches: int | None = None,
) -> ScoredSubmission:
    scored = ScoredSubmission(
        submission_id=submission_id,
        game=game,
        total_matches=total_matches if total_matches is not None else total_matches_for(game),
    )
    session.add(scored)
    await session.commit()
    await session.refresh(scored)
    return scored


async def get_scored_submission(
    session: AsyncSession,
    scored_submission_id: uuid.UUID,
) -> ScoredSubmission | None:
    result = await session.execute(
        select(ScoredSubmission)
        .options(
            joinedload(ScoredSubmission.submission),
            joinedload(ScoredSubmission.matches),
        )
        .where(ScoredSubmission.id == scored_submission_id)
    )
    return result.unique().scalar_one_or_none()


async def list_for_user(
    session: AsyncSession,
    user_id: uuid.UUID,
) -> list[ScoredSubmission]:
    result = await session.execute(
        select(ScoredSubmission)
        .join(Submission, ScoredSubmission.submission_id == Submission.id)
        .options(joinedload(ScoredSubmission.submission))
        .where(Submission.user_id == user_id)
        .order_by(ScoredSubmission.created_at.desc())
    )
    return list(result.scalars().unique().all())


async def get_leaderboard(
    session: AsyncSession,
    game: str,
    limit: int = 20,
) -> list[dict]:
    # DISTINCT ON picks the highest-scoring submission per user efficiently.
    # The outer query then orders those per-user bests by score descending.
    sql = text("""
        SELECT username, score, wins, draws, losses
        FROM (
            SELECT DISTINCT ON (s.user_id)
                u.username,
                ss.score,
                ss.wins,
                ss.draws,
                ss.losses
            FROM scored_submissions ss
            JOIN submissions s ON ss.submission_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE ss.game = :game
              AND ss.status = 'completed'
              AND ss.score IS NOT NULL
            ORDER BY s.user_id, ss.score DESC
        ) best
        ORDER BY score DESC
        LIMIT :limit
    """)
    rows = await session.execute(sql, {"game": game, "limit": limit})
    return [dict(r) for r in rows.mappings().all()]


async def update_status(
    session: AsyncSession,
    scored_submission_id: uuid.UUID,
    status: str,
) -> None:
    ss = await session.get(ScoredSubmission, scored_submission_id)
    if ss:
        ss.status = status
        await session.commit()


async def finalize(
    session: AsyncSession,
    scored_submission_id: uuid.UUID,
    matches: list[Match],
) -> None:
    ss = await session.get(ScoredSubmission, scored_submission_id)
    if not ss:
        return
    score, wins, draws, losses = compute_score(ss.game, matches)
    completed = sum(1 for m in matches if m.status in ("completed", "failed"))
    all_failed = all(m.status == "failed" for m in matches)
    ss.score = score
    ss.wins = wins
    ss.draws = draws
    ss.losses = losses
    ss.matches_completed = completed
    ss.status = "failed" if all_failed else "completed"
    ss.completed_at = datetime.now(timezone.utc)
    await session.commit()
