class GameBot:
    def __init__(self, player_id: int):
        self.player_id = player_id
        self.color = PLAYER_COLOR[player_id]   # injected by the framework

    def _steps(self, pos):
        """Distance this token has travelled from our own start (-1 = base)."""
        if pos.zone == Zone.BASE:
            return -1
        if pos.zone == Zone.RING:
            return (pos.index - START[self.color]) % RING_LENGTH
        return RING_LENGTH - 1 + pos.index   # HOME_COLUMN

    def _landing_ring_index(self, pos, dice):
        """Ring index this token would land on, or None (base→6 aside, home col)."""
        new_d = 0 if pos.zone == Zone.BASE else self._steps(pos) + dice
        if 0 <= new_d <= RING_LENGTH - 2:    # still on the shared ring
            return (START[self.color] + new_d) % RING_LENGTH
        return None

    def _captures(self, state, token_idx):
        my = state.tokens[self.player_id - 1]
        landed = self._landing_ring_index(my[token_idx], state.dice)
        if landed is None:
            return False
        opp = state.tokens[2 - self.player_id]  # the other player's tokens
        # Shared ring numbering: same RING index == same square == capture.
        return any(p.zone == Zone.RING and p.index == landed for p in opp)

    def makeMove(self, state: "LudoState"):
        legal = state.legal_moves
        if not legal:
            return NO_MOVE

        # Prefer a move that captures an opponent token.
        captures = [i for i in legal if self._captures(state, i)]
        if captures:
            return captures[0]

        # Otherwise advance the token closest to home.
        my = state.tokens[self.player_id - 1]
        return max(legal, key=lambda i: self._steps(my[i]))
