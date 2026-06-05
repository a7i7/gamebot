"""
Ludo adapter for Python bots.

Converts the referee's generic MOVE JSON into a typed LudoState and the
bot's return value back into JSON. Injected into the user's module
namespace by the bootstrapper so users can write:

    class GameBot:
        def makeMove(self, state):
            if not state.legal_moves:
                return NO_MOVE
            return state.legal_moves[0]
"""
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Tuple


# Sentinel a bot returns when it has no legal move this turn.
NO_MOVE = "NO_MOVE"

# --- Board geometry -----------------------------------------------------------
RING_LENGTH = 52          # shared ring squares, indices 0..51
HOME_COLUMN_LENGTH = 6    # private home-column squares, indices 0..5
FINISH_INDEX = HOME_COLUMN_LENGTH - 1   # HOME_COLUMN index 5 == HOME (finished)


class Zone(str, Enum):
    """Which part of the board a token sits on."""
    BASE = "BASE"               # in the yard; Position.index == -1
    RING = "RING"               # on the shared ring; index 0..51 (absolute)
    HOME_COLUMN = "HOME_COLUMN"  # in your private column; index 0..5 (5 = HOME)


class Color(str, Enum):
    RED = "RED"
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    BLUE = "BLUE"


# Ring square each color enters / starts on (standard 4-color layout). In this
# 2-player game Player 1 = RED (enters at 0) and Player 2 = YELLOW (enters at 26).
START = {Color.RED: 0, Color.GREEN: 13, Color.YELLOW: 26, Color.BLUE: 39}
PLAYER_COLOR = {1: Color.RED, 2: Color.YELLOW}
SAFE_RING_INDICES = frozenset({0, 8, 13, 21, 26, 34, 39, 47})


@dataclass(frozen=True)
class Position:
    """Where a single token is, as a (zone, index) pair.

    The RING uses one SHARED, ABSOLUTE coordinate system (indices 0..51). Two
    tokens with Zone.RING and the same index occupy the same physical square —
    that is exactly how you detect a capture, with no per-color math needed.

    index meaning by zone:
        Zone.BASE         -1            (in the yard)
        Zone.RING         0 .. 51       shared/absolute ring square
        Zone.HOME_COLUMN  0 .. 5        private to your color; 5 == HOME (done)
    """
    zone: Zone
    index: int

    @property
    def is_base(self) -> bool:
        return self.zone == Zone.BASE

    @property
    def is_finished(self) -> bool:
        return self.zone == Zone.HOME_COLUMN and self.index == FINISH_INDEX


@dataclass(frozen=True)
class LudoState:
    """The current game state passed to your bot's makeMove() each turn.

    The referee rolls the die for you and tells you whose turn it is — your
    only decision is *which* of your tokens to move with that roll.

    Attributes:
        tokens (tuple[tuple[Position]]): Every token's Position, indexed
            [player_index][token_index] where player_index is 0 (P1) or 1 (P2).
            Your own tokens are tokens[player - 1].

        dice (int): Your die roll for this turn, 1-6. You need a 6 to bring a
            token out of base, and an exact roll to land on HOME (no overshoot).

        turn (int): 1-indexed count of total moves played so far.

        player (int): Your player ID, 1 or 2.

        color (Color): Your color (Player 1 = RED, Player 2 = YELLOW).

        colors (dict[int, Color]): Map of player ID -> Color for both players.

        last_move (int | str | None): The opponent's previous action — a token
            index they moved, the string "NO_MOVE", or None on the first turn.

        legal_moves (tuple[int]): Token indices you may legally move this turn.
            Return one of these. If it is empty, you must return NO_MOVE.

    Geometry you may need (the framework does NOT pre-compute landings for you):
        - Your tokens enter the ring at START[self.color] and travel clockwise.
        - A token visits 51 ring squares, then 6 home-column squares (the last,
          index 5, is HOME). RING is shared, so a capture is simply: your moved
          token ends on a RING square whose index equals an opponent token's
          RING index.

    Example:
        # Move the token closest to home, or pass if stuck.
        if not state.legal_moves:
            return NO_MOVE
        def steps(pos):                       # distance from your own start
            if pos.zone == Zone.BASE:
                return -1
            if pos.zone == Zone.RING:
                return (pos.index - START[state.color]) % RING_LENGTH
            return 51 + pos.index             # HOME_COLUMN
        my = state.tokens[state.player - 1]
        return max(state.legal_moves, key=lambda i: steps(my[i]))
    """
    tokens: Tuple[Tuple[Position, ...], ...]
    dice: int
    turn: int
    player: int
    color: Color
    colors: dict
    last_move: Optional[object]
    legal_moves: Tuple[int, ...]


def _to_position(d: dict) -> Position:
    return Position(Zone(d["zone"]), int(d["index"]))


def from_json(player_id: int, msg: dict) -> LudoState:
    board = msg["board"]
    tokens = tuple(tuple(_to_position(p) for p in row) for row in board["tokens"])
    colors = {int(k): Color(v) for k, v in board["colors"].items()}
    lm = msg.get("last_move")
    last_move = lm["move"] if lm else None
    legal = tuple(int(i) for i in msg["legal_moves"])
    return LudoState(
        tokens=tokens,
        dice=int(board["dice"]),
        turn=msg["turn"],
        player=player_id,
        color=colors[player_id],
        colors=colors,
        last_move=last_move,
        legal_moves=legal,
    )


def to_json(move):
    if move == NO_MOVE:
        return "NO_MOVE"
    return int(move)
