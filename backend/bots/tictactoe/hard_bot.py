class GameBot:
    def __init__(self, player_id: int):
        self.player_id = player_id
        self._opponent = 3 - player_id

    def makeMove(self, state: "TicTacToeState") -> "Move":
        # Fast-path: center is always optimal on an empty board
        if len(state.legal_moves) == 9:
            return next(m for m in state.legal_moves if m.row == 1 and m.col == 1)

        best_score = float("-inf")
        best_move = state.legal_moves[0]
        board = state.board
        alpha = float("-inf")

        for move in state.legal_moves:
            new_board = _apply_move(board, move.row, move.col, self.player_id)
            score = _minimax(new_board, 1, False, self.player_id, self._opponent, alpha, float("inf"))
            if score > best_score:
                best_score = score
                best_move = move
            alpha = max(alpha, best_score)

        return best_move


def _check_winner(board):
    lines = [
        # rows
        [(0,0),(0,1),(0,2)], [(1,0),(1,1),(1,2)], [(2,0),(2,1),(2,2)],
        # cols
        [(0,0),(1,0),(2,0)], [(0,1),(1,1),(2,1)], [(0,2),(1,2),(2,2)],
        # diagonals
        [(0,0),(1,1),(2,2)], [(0,2),(1,1),(2,0)],
    ]
    for line in lines:
        vals = [board[r][c] for r, c in line]
        if vals[0] != 0 and vals[0] == vals[1] == vals[2]:
            return vals[0]
    return None


def _apply_move(board, row, col, player):
    return tuple(
        tuple(player if (r == row and c == col) else board[r][c] for c in range(3))
        for r in range(3)
    )


def _minimax(board, depth, is_maximizing, bot, opp, alpha, beta):
    winner = _check_winner(board)
    if winner == bot:
        return 10 - depth
    if winner == opp:
        return depth - 10

    empty = [(r, c) for r in range(3) for c in range(3) if board[r][c] == 0]
    if not empty:
        return 0

    if is_maximizing:
        best = float("-inf")
        for r, c in empty:
            score = _minimax(_apply_move(board, r, c, bot), depth + 1, False, bot, opp, alpha, beta)
            best = max(best, score)
            alpha = max(alpha, best)
            if alpha >= beta:
                break
        return best
    else:
        best = float("inf")
        for r, c in empty:
            score = _minimax(_apply_move(board, r, c, opp), depth + 1, True, bot, opp, alpha, beta)
            best = min(best, score)
            beta = min(beta, best)
            if alpha >= beta:
                break
        return best
