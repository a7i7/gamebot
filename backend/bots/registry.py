from pathlib import Path

_BOTS_ROOT = Path(__file__).parent

OPPONENT_REGISTRY: dict[str, dict[str, dict]] = {
    "tictactoe": {
        "easy":   {"file": str(_BOTS_ROOT / "tictactoe" / "easy_bot.py"),   "lang": "python"},
        "medium": {"file": str(_BOTS_ROOT / "tictactoe" / "medium_bot.py"), "lang": "python"},
        "hard":   {"file": str(_BOTS_ROOT / "tictactoe" / "hard_bot.py"),   "lang": "python"},
    },
}


def get_opponent(game: str, difficulty: str) -> dict:
    try:
        return OPPONENT_REGISTRY[game][difficulty]
    except KeyError:
        raise ValueError(f"No opponent configured for game={game!r} difficulty={difficulty!r}")
