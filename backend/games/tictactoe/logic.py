import copy
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class TicTacToeState:
    board: list  # 3x3 list of lists; 0=empty, 1=player1, 2=player2
    next_player: int = 1

    def copy(self) -> "TicTacToeState":
        return TicTacToeState(
            board=copy.deepcopy(self.board),
            next_player=self.next_player,
        )


class TicTacToeGame:
    name = "tictactoe"
    size = 3

    def config(self) -> dict:
        return {"board_size": self.size}

    def initial_state(self) -> TicTacToeState:
        return TicTacToeState(board=[[0] * self.size for _ in range(self.size)])

    def board_repr(self, state: TicTacToeState) -> list:
        return state.board

    def legal_moves(self, state: TicTacToeState) -> list:
        return [
            [r, c]
            for r in range(self.size)
            for c in range(self.size)
            if state.board[r][c] == 0
        ]

    def is_valid_move(self, state: TicTacToeState, move, player: int) -> bool:
        if not (isinstance(move, (list, tuple)) and len(move) == 2):
            return False
        r, c = move
        if not (isinstance(r, int) and isinstance(c, int)):
            return False
        if not (0 <= r < self.size and 0 <= c < self.size):
            return False
        return state.board[r][c] == 0

    def apply_move(self, state: TicTacToeState, move, player: int) -> TicTacToeState:
        new_state = state.copy()
        new_state.board[move[0]][move[1]] = player
        new_state.next_player = 3 - player
        return new_state

    def is_terminal(self, state: TicTacToeState) -> bool:
        return self.winner(state) is not None or not self.legal_moves(state)

    def format_board(self, state: TicTacToeState) -> str:
        symbols = {0: ".", 1: "X", 2: "O"}
        rows = ["  " + " ".join(symbols[c] for c in row) for row in state.board]
        return "\n".join(rows)

    def winner(self, state: TicTacToeState) -> Optional[int]:
        b = state.board
        n = self.size
        lines = (
            [b[r] for r in range(n)]                              # rows
            + [[b[r][c] for r in range(n)] for c in range(n)]    # cols
            + [[b[i][i] for i in range(n)]]                       # main diag
            + [[b[i][n - 1 - i] for i in range(n)]]              # anti-diag
        )
        for line in lines:
            if line[0] != 0 and all(x == line[0] for x in line):
                return line[0]
        return None
