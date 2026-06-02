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

_PROJECT_ROOT = __import__("pathlib").Path(__file__).parent.parent

_BOTS_DIR = _PROJECT_ROOT / "bots" / "tictactoe"
_OPPONENT_FILES = {
    "easy":   str(_BOTS_DIR / "easy_bot.py"),
    "medium": str(_BOTS_DIR / "medium_bot.py"),
    "hard":   str(_BOTS_DIR / "hard_bot.py"),
}
_OPPONENT_IMAGE = LANG_IMAGE_MAP["python"]

LANG_EXT = {
    "python":     ".py",
    "javascript": ".js",
    "java":       ".java",
    "cpp":        ".cpp",
}


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

        game = GAME_MAP[game_name]()
        user_config     = {"image": LANG_IMAGE_MAP[user_lang], "file": user_file, "protocol_on_stderr": user_lang == "java"}
        opponent_config = {"image": _OPPONENT_IMAGE,           "file": _OPPONENT_FILES[opponent]}

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
