"""Fixture: crashes immediately on the first move."""
import sys


class GameBot:
    def __init__(self, player_id: int):
        pass

    def makeMove(self, state) -> "Move":
        sys.exit(1)
