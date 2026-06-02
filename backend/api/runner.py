import asyncio
import logging
import os
import shutil
import tempfile
import uuid

from referee.referee import Referee

logger = logging.getLogger(__name__)
from referee.main import GAME_MAP, LANG_IMAGE_MAP
from db.engine import AsyncSessionLocal
from db.repos import matches as matches_repo
from db.repos import scored_submissions as scored_submissions_repo
from db.repos.scored_submissions import compute_match_points
from bots.registry import get_opponent

LANG_EXT = {
    "python":     ".py",
    "javascript": ".js",
    "java":       ".java",
    "cpp":        ".cpp",
}

_SCORED_SUBMISSION_DIFFICULTIES = ["easy", "medium", "hard"]
_GAMES_PER_DIFFICULTY = 5


async def run_match(
    match_id: uuid.UUID,
    game_name: str,
    submission_id: uuid.UUID,
    user_code: str,
    user_lang: str,
    opponent: str = "easy",
) -> None:
    async with AsyncSessionLocal() as session:
        await matches_repo.update_status(session, match_id, "running")

    tmpdir = tempfile.mkdtemp(prefix=f"gamebot-{match_id}-")
    try:
        ext = LANG_EXT[user_lang]
        filename = f"GameBot{ext}" if user_lang == "java" else f"bot{ext}"
        user_file = os.path.join(tmpdir, filename)

        with open(user_file, "w") as f:
            f.write(user_code)

        opp = get_opponent(game_name, opponent)
        game = GAME_MAP[game_name]()
        user_config     = {"image": LANG_IMAGE_MAP[user_lang],      "file": user_file, "protocol_on_stderr": user_lang == "java"}
        opponent_config = {"image": LANG_IMAGE_MAP[opp["lang"]], "file": opp["file"]}

        result = await Referee(game, user_config, opponent_config).run()

        async with AsyncSessionLocal() as session:
            await matches_repo.update_match_result(
                session,
                match_id,
                status="completed",
                winner_player=result.winner_player,
                is_draw=result.is_draw,
                reason=result.reason,
                turns=result.turn,
                final_board=result.board,
                bot_logs=result.bot_logs,
                points_earned=compute_match_points(opponent, result.winner_player, result.is_draw),
            )

    except Exception as exc:
        logger.exception("Match %s failed", match_id)
        async with AsyncSessionLocal() as session:
            await matches_repo.update_match_result(
                session,
                match_id,
                status="failed",
                error=str(exc),
            )

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


async def run_scored_submission(
    scored_submission_id: uuid.UUID,
    game_name: str,
    submission_id: uuid.UUID,
    user_code: str,
    user_lang: str,
) -> None:
    async with AsyncSessionLocal() as session:
        await scored_submissions_repo.update_status(session, scored_submission_id, "running")

    match_tasks = []
    match_ids = []

    for difficulty in _SCORED_SUBMISSION_DIFFICULTIES:
        for _ in range(_GAMES_PER_DIFFICULTY):
            async with AsyncSessionLocal() as session:
                match = await matches_repo.create_match(
                    session,
                    game=game_name,
                    player1_submission_id=submission_id,
                    opponent=difficulty,
                    scored_submission_id=scored_submission_id,
                )
            match_ids.append(match.id)
            match_tasks.append(
                run_match(match.id, game_name, submission_id, user_code, user_lang, difficulty)
            )

    await asyncio.gather(*match_tasks, return_exceptions=True)

    async with AsyncSessionLocal() as session:
        matches = await matches_repo.list_for_scored_submission(session, scored_submission_id)
        await scored_submissions_repo.finalize(session, scored_submission_id, matches)
