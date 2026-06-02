import pytest
from games.tictactoe.logic import TicTacToeGame, TicTacToeState


@pytest.fixture
def game():
    return TicTacToeGame()


def test_initial_state_is_empty(game):
    state = game.initial_state()
    assert all(cell == 0 for row in state.board for cell in row)
    assert state.next_player == 1


def test_legal_moves_full_board_initially(game):
    state = game.initial_state()
    assert len(game.legal_moves(state)) == 9


def test_apply_move_places_piece(game):
    state = game.initial_state()
    new_state = game.apply_move(state, [0, 0], player=1)
    assert new_state.board[0][0] == 1
    assert new_state.next_player == 2


def test_apply_move_does_not_mutate_original(game):
    state = game.initial_state()
    _ = game.apply_move(state, [1, 1], player=1)
    assert state.board[1][1] == 0


def test_legal_moves_shrinks_after_move(game):
    state = game.initial_state()
    state = game.apply_move(state, [0, 0], player=1)
    assert len(game.legal_moves(state)) == 8
    assert [0, 0] not in game.legal_moves(state)


def test_is_valid_move_rejects_occupied(game):
    state = game.initial_state()
    state = game.apply_move(state, [0, 0], player=1)
    assert not game.is_valid_move(state, [0, 0], player=2)


def test_is_valid_move_rejects_out_of_bounds(game):
    state = game.initial_state()
    assert not game.is_valid_move(state, [3, 0], player=1)
    assert not game.is_valid_move(state, [-1, 0], player=1)


def test_is_valid_move_rejects_wrong_type(game):
    state = game.initial_state()
    assert not game.is_valid_move(state, "bad", player=1)
    assert not game.is_valid_move(state, [0], player=1)


@pytest.mark.parametrize("winning_moves,expected_winner", [
    # Rows
    ([(0,0),(0,1),(0,2)], 1),
    ([(1,0),(1,1),(1,2)], 1),
    ([(2,0),(2,1),(2,2)], 1),
    # Columns
    ([(0,0),(1,0),(2,0)], 1),
    ([(0,1),(1,1),(2,1)], 1),
    ([(0,2),(1,2),(2,2)], 1),
    # Diagonals
    ([(0,0),(1,1),(2,2)], 1),
    ([(0,2),(1,1),(2,0)], 1),
])
def test_winner_detects_all_lines(game, winning_moves, expected_winner):
    state = game.initial_state()
    for r, c in winning_moves:
        state = TicTacToeState(
            board=[row[:] for row in state.board],
            next_player=state.next_player,
        )
        state.board[r][c] = expected_winner
    assert game.winner(state) == expected_winner


def test_winner_none_on_empty_board(game):
    assert game.winner(game.initial_state()) is None


def test_is_terminal_on_draw(game):
    # Fill board with no winner: 1 2 1 / 1 1 2 / 2 1 2
    b = [[1, 2, 1], [1, 1, 2], [2, 1, 2]]
    state = TicTacToeState(board=b, next_player=1)
    assert game.is_terminal(state)
    assert game.winner(state) is None


def test_is_terminal_on_win(game):
    b = [[1, 1, 1], [0, 2, 0], [2, 0, 0]]
    state = TicTacToeState(board=b, next_player=2)
    assert game.is_terminal(state)
    assert game.winner(state) == 1
