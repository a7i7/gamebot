"""
TicTacToe adapter for Python bots.

Converts the referee's generic MOVE JSON into typed objects and the
bot's return value back into JSON. Injected into the user's module
namespace by the bootstrapper so users can do:

    from tictactoe import TicTacToeState, Move, Cell
"""
from dataclasses import dataclass
from enum import IntEnum
from typing import Optional


class Cell(IntEnum):
    """Represents a cell value on the TicTacToe board.

    Values:
        EMPTY (0): Cell is unoccupied
        P1 (1):    Cell is occupied by player 1
        P2 (2):    Cell is occupied by player 2
    """
    EMPTY = 0
    P1 = 1
    P2 = 2


@dataclass(frozen=True)
class Move:
    """Represents a single TicTacToe move (placing a mark on the board).

    Attributes:
        row (int): Row index (0-2) on the board
        col (int): Column index (0-2) on the board

    Example:
        move = Move(0, 1)  # Place mark at row 0, column 1 (top-middle)
    """
    row: int
    col: int

    def __iter__(self):
        yield self.row
        yield self.col


@dataclass(frozen=True)
class TicTacToeState:
    """The current game state passed to your bot's makeMove() method.

    This object contains everything your bot needs to know about the game:
    the board layout, whose turn it is, what moves are legal, and what
    the opponent just played.

    Attributes:
        board (tuple[tuple[Cell]]): 3x3 grid representing the board state.
            Access via board[row][col] where row/col are 0-2.
            Each cell contains a Cell enum value (EMPTY, P1, or P2).

        turn (int): 1-indexed count of total moves played so far.
            Turn 1 means you're making the first move.
            Turn 2 means the opponent made move 1, now you make move 2.

        player (int): Your player ID (either 1 or 2).
            If cell.value == player, that cell belongs to you.
            Otherwise, if cell != EMPTY, it belongs to the opponent.

        last_move (Move or None): The opponent's most recent move.
            None on your first turn (when no moves have been played yet).
            After that, always a Move(row, col) showing where opponent played.

        legal_moves (tuple[Move]): Pre-computed list of all valid moves.
            Contains Move objects for every empty cell on the board.
            Your makeMove() must return one of these moves.

    Example:
        board layout at state.board:
            [P1,  EMPTY, P2]
            [P1,  EMPTY, P2]
            [EMPTY, EMPTY, EMPTY]

        Accessing: state.board[0][0] == Cell.P1 (top-left)
                   state.board[0][1] == Cell.EMPTY (top-middle)
                   state.board[1][2] == Cell.P2 (middle-right)
    """
    board: tuple          # tuple[tuple[Cell]] — 3x3 grid
    turn: int             # 1-indexed full-game move count
    player: int           # this bot's player ID (1 or 2)
    last_move: Optional[Move]     # opponent's last move, or None
    legal_moves: tuple    # tuple[Move] — pre-computed legal moves


def from_json(player_id: int, msg: dict) -> TicTacToeState:
    board = tuple(tuple(Cell(c) for c in row) for row in msg["board"])
    lm = msg.get("last_move")
    last_move = Move(lm["move"][0], lm["move"][1]) if lm else None
    legal = tuple(Move(m[0], m[1]) for m in msg["legal_moves"])
    return TicTacToeState(
        board=board,
        turn=msg["turn"],
        player=player_id,
        last_move=last_move,
        legal_moves=legal,
    )


def to_json(move) -> list:
    if isinstance(move, Move):
        return [move.row, move.col]
    return list(move)
