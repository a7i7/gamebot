import random


class GameBot:
    def __init__(self, player_id: int):
        self.player_id = player_id

    def makeMove(self, state: "TicTacToeState") -> "Move":
        return random.choice(state.legal_moves)
