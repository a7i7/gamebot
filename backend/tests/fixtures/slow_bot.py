"""Fixture: sleeps longer than the 1-second timeout on every move."""
import time


class GameBot:
    def __init__(self, player_id: int):
        pass

    def makeMove(self, state) -> "Move":
        time.sleep(2)
        return state.legal_moves[0]
