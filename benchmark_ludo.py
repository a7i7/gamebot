"""
Runs N matches between two ludo bots directly (no Docker).
Usage: python benchmark_ludo.py <bot1> <bot2> [N]
  bot1, bot2: easy | medium | hard
  N: number of matches (default 10)
Example: python benchmark_ludo.py medium hard 20
"""
import sys
from dataclasses import dataclass

sys.path.insert(0, "backend")

from games.ludo.logic import (
    LudoGame,
    Zone, Color, Position,
    START, RING_LENGTH, HOME_COLUMN_LENGTH, PLAYER_COLOR, SAFE_RING_INDICES,
    BASE_POSITION,
)

NO_MOVE = "NO_MOVE"

INJECTED = dict(
    Zone=Zone, Color=Color, Position=Position,
    START=START, RING_LENGTH=RING_LENGTH, HOME_COLUMN_LENGTH=HOME_COLUMN_LENGTH,
    PLAYER_COLOR=PLAYER_COLOR, SAFE_RING_INDICES=SAFE_RING_INDICES,
    NO_MOVE=NO_MOVE,
)


def load_bot(path: str, player_id: int):
    ns = {**INJECTED}
    with open(path) as f:
        exec(f.read(), ns)
    return ns["GameBot"](player_id)


@dataclass
class BotState:
    tokens: list
    dice: int
    legal_moves: list


def run_match(bot1, bot2) -> int:
    """Returns winner player id (1 or 2), or 0 for draw/cap."""
    game = LudoGame()
    state = game.initial_state()

    while not game.is_terminal(state):
        state = game.start_turn(state)
        legal = game.legal_moves(state)
        player = state.next_player
        bot = bot1 if player == 1 else bot2

        bot_state = BotState(tokens=state.tokens, dice=state.dice, legal_moves=legal)
        move = bot.makeMove(bot_state)

        if not game.is_valid_move(state, move, player):
            move = legal[0] if legal else NO_MOVE

        state = game.apply_move(state, move, player)

    return game.winner(state) or 0


VALID_BOTS = {"easy", "medium", "hard"}

_ANSI = {"easy": "\033[32m", "medium": "\033[33m", "hard": "\033[31m", "draw": "\033[90m"}
_RESET = "\033[0m"


def c(name: str, text: str) -> str:
    return f"{_ANSI.get(name, '')}{text}{_RESET}"


def main():
    args = sys.argv[1:]
    if len(args) < 2 or args[0] not in VALID_BOTS or args[1] not in VALID_BOTS:
        print("Usage: python benchmark_ludo.py <bot1> <bot2> [N]")
        print(f"  bot1, bot2: {' | '.join(sorted(VALID_BOTS))}")
        sys.exit(1)

    name1, name2 = args[0], args[1]
    n = int(args[2]) if len(args) > 2 else 10

    path1 = f"backend/bots/ludo/{name1}_bot.py"
    path2 = f"backend/bots/ludo/{name2}_bot.py"

    wins = {1: 0, 2: 0, "draw": 0}
    label = {
        1: f"{c(name1, name1 + '_bot')} (P1)",
        2: f"{c(name2, name2 + '_bot')} (P2)",
        "draw": c("draw", "draw"),
    }

    print(f"Running {n} matches: {c(name1, name1 + '_bot')} (P1) vs {c(name2, name2 + '_bot')} (P2)\n")

    for i in range(n):
        bot1 = load_bot(path1, 1)
        bot2 = load_bot(path2, 2)
        winner = run_match(bot1, bot2)
        key = winner if winner in (1, 2) else "draw"
        wins[key] += 1
        print(f"  Match {i + 1:>2}: {label[key]} wins")

    print(f"\nResults after {n} matches:")
    print(f"  {c(name1, name1 + '_bot')} wins : {wins[1]}")
    print(f"  {c(name2, name2 + '_bot')} wins : {wins[2]}")
    if wins["draw"]:
        print(f"  {c('draw', 'draws')}          : {wins['draw']}")
    total = wins[1] + wins[2]
    if total > 0:
        print(f"\n  {c(name1, name1 + '_bot')} win rate: {wins[1] / total * 100:.1f}%")
        print(f"  {c(name2, name2 + '_bot')} win rate: {wins[2] / total * 100:.1f}%")


if __name__ == "__main__":
    main()
