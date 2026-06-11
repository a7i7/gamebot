"""
Runs N matches between two ludo bots directly (no Docker).
Usage: python benchmark_ludo.py <bot1> <bot2> [N] [--max-depth D] [--time-limit T]
  bot1, bot2: easy | medium | hard
  N: number of matches (default 10)
  --max-depth D  override hard_bot MAX_DEPTH (default 5)
  --time-limit T override hard_bot TIME_LIMIT in seconds (benchmark default: 0.05)
Example: python benchmark_ludo.py medium hard 20 --max-depth 7 --time-limit 9
"""
import sys
from collections import Counter
from dataclasses import dataclass
from typing import Any

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


def load_bot(path: str, player_id: int, overrides: dict | None = None):
    ns: dict[str, Any] = {**INJECTED}
    with open(path) as f:
        exec(f.read(), ns)
    bot = ns["GameBot"](player_id)
    if overrides:
        for k, v in overrides.items():
            setattr(bot, k, v)
    return bot


@dataclass
class BotState:
    tokens: list
    dice: int
    legal_moves: list


def run_match(bot1, bot2) -> tuple[int, list, list]:
    """Returns (winner, bot1_turn_stats, bot2_turn_stats)."""
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

    winner = game.winner(state) or 0
    return winner, getattr(bot1, "turn_stats", []), getattr(bot2, "turn_stats", [])


VALID_BOTS = {"easy", "medium", "hard"}

_ANSI = {"easy": "\033[32m", "medium": "\033[33m", "hard": "\033[31m", "draw": "\033[90m"}
_RESET = "\033[0m"


def c(name: str, text: str) -> str:
    return f"{_ANSI.get(name, '')}{text}{_RESET}"


def _parse_flag(args: list[str], flag: str, cast, default):
    try:
        i = args.index(flag)
        val = cast(args[i + 1])
        args = args[:i] + args[i + 2:]
        return val, args
    except (ValueError, IndexError):
        return default, args


def _print_depth_stats(label: str, all_stats: list[dict], max_depth: int) -> None:
    if not all_stats:
        return
    depth_counts = Counter(s["used_depth"] for s in all_stats)
    total_turns = len(all_stats)
    avg_ms = sum(s["elapsed"] for s in all_stats) / total_turns * 1000
    print(f"\n  {label} depth usage ({total_turns} turns, avg {avg_ms:.1f}ms/turn):")
    for d in range(0, max_depth + 1):
        count = depth_counts.get(d, 0)
        if count == 0:
            continue
        bar = "#" * (count * 20 // total_turns)
        tag = " [greedy fallback]" if d == 0 else ""
        print(f"    depth {d}: {count:>4} turns  {bar}{tag}")


def main():
    args = list(sys.argv[1:])

    max_depth, args = _parse_flag(args, "--max-depth", int, None)
    time_limit, args = _parse_flag(args, "--time-limit", float, None)

    if len(args) < 2 or args[0] not in VALID_BOTS or args[1] not in VALID_BOTS:
        print("Usage: python benchmark_ludo.py <bot1> <bot2> [N] [--max-depth D] [--time-limit T]")
        print(f"  bot1, bot2: {' | '.join(sorted(VALID_BOTS))}")
        sys.exit(1)

    name1, name2 = args[0], args[1]
    n = int(args[2]) if len(args) > 2 else 10

    path1 = f"backend/bots/ludo/{name1}_bot.py"
    path2 = f"backend/bots/ludo/{name2}_bot.py"

    # Benchmark default: 0.05s/turn keeps each match under ~15s.
    # Use --time-limit to raise it for serious depth experiments.
    effective_time_limit = time_limit if time_limit is not None else 0.05
    effective_max_depth = max_depth if max_depth is not None else 5

    overrides: dict[str, Any] = {"TIME_LIMIT": effective_time_limit}
    if max_depth is not None:
        overrides["MAX_DEPTH"] = max_depth

    wins = {1: 0, 2: 0, "draw": 0}
    label = {
        1: f"{c(name1, name1 + '_bot')} (P1)",
        2: f"{c(name2, name2 + '_bot')} (P2)",
        "draw": c("draw", "draw"),
    }
    all_stats: dict[int, list] = {1: [], 2: []}

    depth_note = f" [max_depth={effective_max_depth}, time_limit={effective_time_limit}s]"
    print(f"Running {n} matches: {c(name1, name1 + '_bot')} (P1) vs {c(name2, name2 + '_bot')} (P2){depth_note}\n")

    for i in range(n):
        bot1 = load_bot(path1, 1, overrides)
        bot2 = load_bot(path2, 2, overrides)
        winner, stats1, stats2 = run_match(bot1, bot2)
        all_stats[1].extend(stats1)
        all_stats[2].extend(stats2)
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

    for pid, name in [(1, name1), (2, name2)]:
        _print_depth_stats(f"{name}_bot (P{pid})", all_stats[pid], effective_max_depth)


if __name__ == "__main__":
    main()
