import random


class GameBot:
    def __init__(self, player_id: int):
        self.player_id = player_id

    def makeMove(self, state: "TicTacToeState") -> "Move":
        opponent = 3 - state.player

        for move in state.legal_moves:
            if self._wins(state.board, move, state.player):
                return move

        for move in state.legal_moves:
            if self._wins(state.board, move, opponent):
                return move

        return random.choice(state.legal_moves)

    def _wins(self, board, move, player) -> bool:
        b = [list(row) for row in board]
        b[move.row][move.col] = player
        n = len(b)
        lines = (
            [b[r] for r in range(n)]
            + [[b[r][c] for r in range(n)] for c in range(n)]
            + [[b[i][i] for i in range(n)]]
            + [[b[i][n - 1 - i] for i in range(n)]]
        )
        return any(line[0] != 0 and all(x == line[0] for x in line) for line in lines)
