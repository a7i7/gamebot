SAFE_RING_INDICES = frozenset({0, 8, 13, 21, 26, 34, 39, 47})  # injected by framework


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

    def _new_steps(self, pos, dice):
        return 0 if pos.zone == Zone.BASE else self._steps(pos) + dice

    def _finishes(self, pos, dice):
        # FINISH distance = 51 ring steps (0..50) + 6 home squares - 1 = 56.
        return self._new_steps(pos, dice) == (RING_LENGTH - 2) + HOME_COLUMN_LENGTH

    def _landing_ring_index(self, pos, dice):
        new_d = self._new_steps(pos, dice)
        if 0 <= new_d <= RING_LENGTH - 2:    # still on the shared ring
            return (START[self.color] + new_d) % RING_LENGTH
        return None

    def _captures(self, state, token_idx):
        my = state.tokens[self.player_id - 1]
        landed = self._landing_ring_index(my[token_idx], state.dice)
        if landed is None or landed in SAFE_RING_INDICES:
            return False
        opp = state.tokens[2 - self.player_id]
        return any(p.zone == Zone.RING and p.index == landed for p in opp)

    def makeMove(self, state: "LudoState"):
        legal = state.legal_moves
        if not legal:
            return NO_MOVE

        my = state.tokens[self.player_id - 1]

        # 1. Finish a token if this roll lands it exactly on HOME.
        finishers = [i for i in legal if self._finishes(my[i], state.dice)]
        if finishers:
            return finishers[0]

        # 2. Capture an opponent token (shared ring index collision).
        captures = [i for i in legal if self._captures(state, i)]
        if captures:
            return captures[0]

        # 3. Bring a token out of base on a 6 (more tokens in play = more options).
        if state.dice == 6:
            from_base = [i for i in legal if my[i].zone == Zone.BASE]
            if from_base:
                return from_base[0]

        # 4. Advance the most-advanced token toward home.
        return max(legal, key=lambda i: self._steps(my[i]))
