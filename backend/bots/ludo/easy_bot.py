import random


class GameBot:
    def __init__(self, player_id: int):
        self.player_id = player_id

    def makeMove(self, state: "LudoState"):
        if not state.legal_moves:
            return NO_MOVE
        return random.choice(state.legal_moves)
