#!/usr/bin/env python3
"""
Run a 1v1 bot match.

Usage:
    python -m referee.main \\
        --game tictactoe \\
        --bot1-file /path/to/my_bot.py --bot1-lang python \\
        --bot2-file /path/to/other_bot.js --bot2-lang javascript
"""
import asyncio
import argparse
import os
import sys

from .referee import Referee
from games.tictactoe.logic import TicTacToeGame

GAME_MAP = {
    "tictactoe": TicTacToeGame,
    # Register new games here, e.g.:
    # "connect4": Connect4Game,
}

LANG_IMAGE_MAP = {
    "python":     "gamebot-python:latest",
    "javascript": "gamebot-javascript:latest",
    "java":       "gamebot-java:latest",
    "cpp":        "gamebot-cpp:latest",
}


def parse_args():
    p = argparse.ArgumentParser(description="Run a 1v1 bot match.")
    p.add_argument("--game", required=True, choices=list(GAME_MAP), help="Game to play")
    p.add_argument("--bot1-file", required=True, help="Absolute path to bot 1's file")
    p.add_argument("--bot1-lang", required=True, choices=list(LANG_IMAGE_MAP), help="Bot 1 language")
    p.add_argument("--bot2-file", required=True, help="Absolute path to bot 2's file")
    p.add_argument("--bot2-lang", required=True, choices=list(LANG_IMAGE_MAP), help="Bot 2 language")
    p.add_argument("--verbose", action="store_true", help="Print the board after every move")
    return p.parse_args()


async def main():
    args = parse_args()

    bot1_file = os.path.abspath(args.bot1_file)
    bot2_file = os.path.abspath(args.bot2_file)

    for path in [bot1_file, bot2_file]:
        if not os.path.isfile(path):
            print(f"Error: bot file not found: {path}", file=sys.stderr)
            sys.exit(1)

    game = GAME_MAP[args.game]()
    bot1_config = {"image": LANG_IMAGE_MAP[args.bot1_lang], "file": bot1_file}
    bot2_config = {"image": LANG_IMAGE_MAP[args.bot2_lang], "file": bot2_file}

    print(f"Starting match: {args.game} | bot1={args.bot1_lang} vs bot2={args.bot2_lang}")

    referee = Referee(game, bot1_config, bot2_config, verbose=args.verbose)
    result = await referee.run()

    print("-" * 40)
    if result.is_draw:
        print(f"DRAW after {result.turn} turns")
    else:
        print(f"Player {result.winner_player} WINS  (reason: {result.reason}, turns: {result.turn})")

    if any(result.bot_logs):
        for i, log in enumerate(result.bot_logs, 1):
            if log.strip():
                print(f"\n--- Bot {i} stderr ---\n{log.strip()}")


if __name__ == "__main__":
    asyncio.run(main())
