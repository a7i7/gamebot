import pytest
from games.tictactoe.adapters.python import (
    TicTacToeState, Move, Cell, from_json, to_json,
)


SAMPLE_MOVE_MSG = {
    "type": "MOVE",
    "turn": 4,
    "board": [[1, 0, 2], [0, 1, 0], [0, 0, 0]],
    "last_move": {"player": 2, "move": [0, 2]},
    "legal_moves": [[0, 1], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2]],
}


def test_from_json_produces_correct_state():
    state = from_json(player_id=1, msg=SAMPLE_MOVE_MSG)
    assert isinstance(state, TicTacToeState)
    assert state.player == 1
    assert state.turn == 4
    assert state.board[0][0] == Cell.P1
    assert state.board[0][2] == Cell.P2
    assert state.board[0][1] == Cell.EMPTY


def test_from_json_last_move():
    state = from_json(player_id=1, msg=SAMPLE_MOVE_MSG)
    assert state.last_move == Move(0, 2)


def test_from_json_no_last_move():
    msg = dict(SAMPLE_MOVE_MSG, last_move=None)
    state = from_json(player_id=2, msg=msg)
    assert state.last_move is None


def test_from_json_legal_moves():
    state = from_json(player_id=1, msg=SAMPLE_MOVE_MSG)
    assert Move(0, 1) in state.legal_moves
    assert Move(2, 2) in state.legal_moves
    assert len(state.legal_moves) == 6


def test_from_json_board_is_immutable():
    state = from_json(player_id=1, msg=SAMPLE_MOVE_MSG)
    # TicTacToeState is frozen=True, board is a tuple of tuples
    assert isinstance(state.board, tuple)
    assert isinstance(state.board[0], tuple)


def test_to_json_from_move_object():
    assert to_json(Move(1, 2)) == [1, 2]


def test_to_json_from_list():
    assert to_json([0, 2]) == [0, 2]


def test_to_json_from_tuple():
    assert to_json((2, 1)) == [2, 1]


def test_move_iteration():
    r, c = Move(1, 2)
    assert r == 1 and c == 2
