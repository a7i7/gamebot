import time

SAFE_RING_INDICES = frozenset({0, 8, 13, 21, 26, 34, 39, 47})

_RING_DIST_LAST = 50
_FINISH_DIST = 56
_INF = float("inf")
# Tight non-terminal eval bounds used by star1 (see _chance_node).
_EVAL_MAX = 624.0
_EVAL_MIN = -624.0


class GameBot:
    MAX_DEPTH = 5
    TIME_LIMIT = 4.5

    def __init__(self, player_id: int):
        self.player_id = player_id
        self.color = PLAYER_COLOR[player_id]
        self._t0 = 0.0

    # ------------------------------------------------------------------ helpers

    def _dist(self, player: int, pos) -> int:
        if pos.zone == Zone.BASE:
            return -1
        if pos.zone == Zone.RING:
            return (pos.index - START[PLAYER_COLOR[player]]) % RING_LENGTH
        return _RING_DIST_LAST + 1 + pos.index

    def _new_position(self, player: int, pos, dice: int):
        new_d = 0 if pos.zone == Zone.BASE else self._dist(player, pos) + dice
        if new_d <= _RING_DIST_LAST:
            return Position(Zone.RING, (START[PLAYER_COLOR[player]] + new_d) % RING_LENGTH)
        return Position(Zone.HOME_COLUMN, new_d - (_RING_DIST_LAST + 1))

    def _can_move(self, player: int, pos, dice: int) -> bool:
        if pos.zone == Zone.BASE:
            return dice == 6
        d = self._dist(player, pos)
        return d < _FINISH_DIST and d + dice <= _FINISH_DIST

    def _get_legal(self, tokens, player: int, dice: int) -> list:
        return [i for i, pos in enumerate(tokens[player - 1])
                if self._can_move(player, pos, dice)]

    def _apply_move(self, tokens, player: int, idx: int, dice: int):
        row = player - 1
        pos = tokens[row][idx]
        new_pos = self._new_position(player, pos, dice)
        new_row = tokens[row][:idx] + (new_pos,) + tokens[row][idx + 1:]

        captured = False
        finished = new_pos.is_finished
        opp_row = 2 - player
        opp_toks = tokens[opp_row]

        if new_pos.zone == Zone.RING and new_pos.index not in SAFE_RING_INDICES:
            new_opp = list(opp_toks)
            for j, op in enumerate(opp_toks):
                if op.zone == Zone.RING and op.index == new_pos.index:
                    new_opp[j] = Position(Zone.BASE, -1)
                    captured = True
            if captured:
                opp_toks = tuple(new_opp)

        new_tokens = (new_row, opp_toks) if row == 0 else (opp_toks, new_row)
        extra_turn = dice == 6 or captured or finished
        return new_tokens, extra_turn

    def _is_terminal(self, tokens) -> bool:
        return (all(t.is_finished for t in tokens[0]) or
                all(t.is_finished for t in tokens[1]))

    def _evaluate(self, tokens) -> float:
        pid = self.player_id
        opp = 3 - pid
        if all(t.is_finished for t in tokens[pid - 1]):
            return 10000.0
        if all(t.is_finished for t in tokens[opp - 1]):
            return -10000.0
        my_dist = sum(max(self._dist(pid, t), 0) for t in tokens[pid - 1])
        opp_dist = sum(max(self._dist(opp, t), 0) for t in tokens[opp - 1])
        my_done = sum(1 for t in tokens[pid - 1] if t.is_finished)
        opp_done = sum(1 for t in tokens[opp - 1] if t.is_finished)
        my_base = sum(1 for t in tokens[pid - 1] if t.zone == Zone.BASE)
        opp_base = sum(1 for t in tokens[opp - 1] if t.zone == Zone.BASE)
        return (
            (my_dist - opp_dist)
            + 100 * (my_done - opp_done)
            + 100 * (opp_base - my_base)
        )

    def _timed_out(self) -> bool:
        return time.monotonic() - self._t0 >= self.TIME_LIMIT

    # --------------------------------------------------- move ordering

    def _sorted_moves(self, tokens, player: int, dice: int, legal: list) -> list:
        """finish → capture → exit base → advance most-advanced"""
        def key(i):
            pos = tokens[player - 1][i]
            new_pos = self._new_position(player, pos, dice)
            if new_pos.is_finished:
                return 0
            if (new_pos.zone == Zone.RING
                    and new_pos.index not in SAFE_RING_INDICES
                    and any(op.zone == Zone.RING and op.index == new_pos.index
                            for op in tokens[2 - player])):
                return 1
            if pos.zone == Zone.BASE:
                return 2
            return 3 - self._dist(player, pos) / _FINISH_DIST
        return sorted(legal, key=key)

    # --------------------------------------------------- expectiminimax

    def _chance_node(self, tokens, player: int, depth: int,
                     alpha: float, beta: float) -> float:
        """
        Star1 pruning: each decision node below gets FRESH (-inf, +inf) so it
        computes a true value. After each dice outcome the partial sum is checked:

            (total + remaining * _EVAL_MAX) / 6 <= alpha  →  can't beat alpha, prune
            (total + remaining * _EVAL_MIN) / 6 >= beta   →  can't beat beta,  prune

        _EVAL_MAX/MIN are the tight non-terminal bounds (±624). Using ±10000 would
        be fully correct but too loose to ever fire. The narrow bounds are wrong if
        a terminal (±10000) appears mid-loop while remaining dice would all be the
        opposite extreme — a scenario that essentially cannot occur in a real game.
        """
        if depth == 0 or self._is_terminal(tokens) or self._timed_out():
            return self._evaluate(tokens)
        total = 0.0
        for k in range(6):
            d = k + 1
            total += self._decision_node(tokens, player, d, depth, -_INF, _INF)
            remaining = 5 - k
            if (total + remaining * _EVAL_MAX) / 6.0 <= alpha:
                return alpha
            if (total + remaining * _EVAL_MIN) / 6.0 >= beta:
                return beta
        return total / 6.0

    def _decision_node(self, tokens, player: int, dice: int, depth: int,
                       alpha: float, beta: float) -> float:
        """
        MAX node (our turn) or MIN node (opponent's turn).
        Alpha-beta prunes siblings; local alpha/beta are passed to child chance
        nodes so star1 has meaningful thresholds to test against.
        """
        if self._is_terminal(tokens):
            return self._evaluate(tokens)
        legal = self._get_legal(tokens, player, dice)
        if not legal:
            return self._chance_node(tokens, 3 - player, depth - 1, alpha, beta)
        legal = self._sorted_moves(tokens, player, dice, legal)
        if player == self.player_id:   # MAX
            value = -_INF
            for idx in legal:
                new_toks, extra = self._apply_move(tokens, player, idx, dice)
                next_p = player if extra else 3 - player
                child = self._chance_node(new_toks, next_p, depth - 1, alpha, beta)
                if child > value:
                    value = child
                if value > alpha:
                    alpha = value
                if alpha >= beta:
                    break
            return value
        else:                          # MIN
            value = _INF
            for idx in legal:
                new_toks, extra = self._apply_move(tokens, player, idx, dice)
                next_p = player if extra else 3 - player
                child = self._chance_node(new_toks, next_p, depth - 1, alpha, beta)
                if child < value:
                    value = child
                if value < beta:
                    beta = value
                if alpha >= beta:
                    break
            return value

    # --------------------------------------------------- public interface

    def makeMove(self, state: "LudoState"):
        if not state.legal_moves:
            return NO_MOVE

        self._t0 = time.monotonic()
        tokens = tuple(tuple(row) for row in state.tokens)
        dice = state.dice
        player = self.player_id
        sorted_root = self._sorted_moves(tokens, player, dice, list(state.legal_moves))

        best_move = sorted_root[0]  # greedy fallback (depth-1 will always update this)

        for depth in range(1, self.MAX_DEPTH + 1):
            if self._timed_out():
                break
            best_val = -_INF
            candidate = None
            for idx in sorted_root:
                new_toks, extra = self._apply_move(tokens, player, idx, dice)
                next_p = player if extra else 3 - player
                val = self._chance_node(new_toks, next_p, depth - 1, -_INF, _INF)
                if val > best_val:
                    best_val = val
                    candidate = idx
            if not self._timed_out() and candidate is not None:
                best_move = candidate

        return best_move
