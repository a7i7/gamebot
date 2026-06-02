"""Fixture: allocates more than 300MB to trigger OOM kill."""


class GameBot:
    def __init__(self, player_id: int):
        # Allocate 350MB immediately on construction.
        self._leak = bytearray(350 * 1024 * 1024)

    def makeMove(self, state) -> "Move":
        return state.legal_moves[0]
