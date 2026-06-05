import copy
import random
from dataclasses import dataclass
from enum import Enum
from typing import Optional

# --- Board geometry (2-player, core-simplified Ludo) ---------------------------
#
# A token's position is a (zone, index) pair:
#
#   Zone.BASE         index = -1            the token is in its yard
#   Zone.RING         index 0 .. 51         SHARED, ABSOLUTE ring square
#   Zone.HOME_COLUMN  index 0 .. 5          private to the color; index 5 = HOME
#
# The RING is numbered with a single shared coordinate system, so two tokens on
# the same physical square always have the SAME ring index regardless of color —
# that is exactly how a capture is detected. Where a color enters the ring (and
# therefore where it later turns off into its home column) differs per color: see
# START below.

RING_LENGTH = 52                 # shared ring squares, indices 0..51
HOME_COLUMN_LENGTH = 6           # private home-column squares, indices 0..5
FINISH_INDEX = HOME_COLUMN_LENGTH - 1   # HOME_COLUMN index 5 == HOME (finished)

# Per-player linear distance run from a color's own start (used only for the
# movement math). 0..50 cover the 51 ring squares the token visits; 51..56 cover
# the 6 home-column squares; 56 is HOME.
_RING_DISTANCE_LAST = RING_LENGTH - 2   # 50: last ring distance before home column
FINISH_DISTANCE = _RING_DISTANCE_LAST + HOME_COLUMN_LENGTH   # 56

TOKENS_PER_PLAYER = 4
MAX_MOVES = 800                  # turn cap to bound runaway games (rarely reached)


class Zone(str, Enum):
    BASE = "BASE"
    RING = "RING"
    HOME_COLUMN = "HOME_COLUMN"


class Color(str, Enum):
    RED = "RED"
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    BLUE = "BLUE"


# Ring square each color enters / starts on (standard 4-color layout).
START = {Color.RED: 0, Color.GREEN: 13, Color.YELLOW: 26, Color.BLUE: 39}

# This 2-player game uses opposite corners: Player 1 = RED, Player 2 = YELLOW.
PLAYER_COLOR = {1: Color.RED, 2: Color.YELLOW}

# Ring squares where captures are forbidden: the 4 start squares plus 4 midpoint stars.
SAFE_RING_INDICES = frozenset({0, 8, 13, 21, 26, 34, 39, 47})


@dataclass(frozen=True)
class Position:
    zone: Zone
    index: int

    @property
    def is_base(self) -> bool:
        return self.zone == Zone.BASE

    @property
    def is_finished(self) -> bool:
        return self.zone == Zone.HOME_COLUMN and self.index == FINISH_INDEX

    def as_dict(self) -> dict:
        return {"zone": self.zone.value, "index": self.index}


BASE_POSITION = Position(Zone.BASE, -1)


def _player_start(player: int) -> int:
    return START[PLAYER_COLOR[player]]


def _distance(player: int, pos: Position) -> int:
    """Steps a token has travelled from its own start: -1 (base) .. 56 (HOME)."""
    if pos.zone == Zone.BASE:
        return -1
    if pos.zone == Zone.RING:
        return (pos.index - _player_start(player)) % RING_LENGTH
    return _RING_DISTANCE_LAST + 1 + pos.index   # HOME_COLUMN: 51 + index


def _position(player: int, d: int) -> Position:
    """Inverse of _distance: build a (zone, index) from a linear distance."""
    if d < 0:
        return BASE_POSITION
    if d <= _RING_DISTANCE_LAST:
        return Position(Zone.RING, (_player_start(player) + d) % RING_LENGTH)
    return Position(Zone.HOME_COLUMN, d - (_RING_DISTANCE_LAST + 1))


@dataclass
class LudoState:
    tokens: list          # [[Position, Position], [Position, Position]] per player
    dice: int = 0         # current roll, 0 before the first start_turn
    next_player: int = 1  # player about to move (invariant the referee relies on)
    move_count: int = 0   # total moves played (NO_MOVEs included); drives the cap

    def copy(self) -> "LudoState":
        return LudoState(
            tokens=copy.deepcopy(self.tokens),
            dice=self.dice,
            next_player=self.next_player,
            move_count=self.move_count,
        )


class LudoGame:
    name = "ludo"

    def config(self) -> dict:
        return {"tokens_per_player": TOKENS_PER_PLAYER}

    def initial_state(self) -> LudoState:
        return LudoState(
            tokens=[[BASE_POSITION] * TOKENS_PER_PLAYER for _ in range(2)],
            dice=0,
            next_player=1,
            move_count=0,
        )

    def start_turn(self, state: LudoState) -> LudoState:
        """Referee hook: roll the die for the player about to move."""
        new_state = state.copy()
        new_state.dice = random.randint(1, 6)
        return new_state

    def board_repr(self, state: LudoState) -> dict:
        # The die rides inside the board payload — that's how the bot learns its
        # roll (the MOVE message's `board` field is typed Any). Colors are sent so
        # the bot/UI can label players.
        return {
            "tokens": [[p.as_dict() for p in row] for row in state.tokens],
            "dice": state.dice,
            "colors": {str(p): PLAYER_COLOR[p].value for p in (1, 2)},
        }

    def _can_move(self, player: int, pos: Position, dice: int) -> bool:
        if pos.zone == Zone.BASE:
            return dice == 6                 # only a 6 frees a token from base
        d = _distance(player, pos)
        if d >= FINISH_DISTANCE:
            return False                     # already home
        return d + dice <= FINISH_DISTANCE   # exact roll needed to finish

    def legal_moves(self, state: LudoState) -> list:
        """Token indices the current player may move with the current die."""
        player = state.next_player
        toks = state.tokens[player - 1]
        return [i for i, p in enumerate(toks) if self._can_move(player, p, state.dice)]

    def is_valid_move(self, state: LudoState, move, player: int) -> bool:
        legal = self.legal_moves(state)
        if move == "NO_MOVE":
            return not legal
        if not isinstance(move, int) or isinstance(move, bool):
            return False
        return move in legal

    def apply_move(self, state: LudoState, move, player: int) -> LudoState:
        new_state = state.copy()
        new_state.move_count += 1

        captured = False
        finished = False

        if move != "NO_MOVE":
            toks = new_state.tokens[player - 1]
            pos = toks[move]
            new_d = 0 if pos.zone == Zone.BASE else _distance(player, pos) + state.dice
            landed = _position(player, new_d)
            toks[move] = landed

            finished = landed.is_finished

            # Capture: an opponent token on the SAME shared ring index is sent
            # back to base. Home columns are private, so no captures there.
            # Safe squares are immune to capture.
            if landed.zone == Zone.RING and landed.index not in SAFE_RING_INDICES:
                opp = 3 - player
                opp_toks = new_state.tokens[opp - 1]
                for j, op in enumerate(opp_toks):
                    if op.zone == Zone.RING and op.index == landed.index:
                        opp_toks[j] = BASE_POSITION
                        captured = True

        # A 6, a capture, or landing a token on HOME each grant an extra turn.
        if move != "NO_MOVE" and (state.dice == 6 or captured or finished):
            new_state.next_player = player
        else:
            new_state.next_player = 3 - player
        return new_state

    def is_terminal(self, state: LudoState) -> bool:
        if state.move_count >= MAX_MOVES:
            return True
        return any(all(p.is_finished for p in toks) for toks in state.tokens)

    def winner(self, state: LudoState) -> Optional[int]:
        for player in (1, 2):
            if all(p.is_finished for p in state.tokens[player - 1]):
                return player
        # Reached the move cap with no outright winner: greater total progress
        # wins; an exact tie is a draw.
        if state.move_count >= MAX_MOVES:
            s1 = sum(max(_distance(1, p), 0) for p in state.tokens[0])
            s2 = sum(max(_distance(2, p), 0) for p in state.tokens[1])
            if s1 > s2:
                return 1
            if s2 > s1:
                return 2
        return None

    def format_board(self, state: LudoState) -> str:
        def fmt(p: Position) -> str:
            if p.zone == Zone.BASE:
                return "base"
            if p.is_finished:
                return "HOME"
            if p.zone == Zone.RING:
                return f"ring{p.index}"
            return f"home{p.index}"
        rows = [f"  dice={state.dice}"]
        for player in (1, 2):
            label = f"P{player} ({PLAYER_COLOR[player].value})"
            rows.append(f"  {label}: " + ", ".join(fmt(p) for p in state.tokens[player - 1]))
        return "\n".join(rows)
