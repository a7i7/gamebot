"""Fixture: always returns an out-of-bounds move."""


class GameBot:
    def __init__(self, player_id: int):
        pass

    def makeMove(self, state) -> "Move":
        return [99, 99]
