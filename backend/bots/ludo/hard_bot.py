import time

# ===========================================================================
# Integer engine. Every token is a single relative distance:
#     -1     = BASE
#     0..50  = ring, measured from the token's own start square
#     51..55 = home column squares 0..4
#     56     = finished (home column square 5)
# A player's four tokens are kept as an ascending-sorted 4-tuple, so token
# permutations and stacked duplicates collapse into one canonical state.
# ===========================================================================

_FINISH = 56
_INF = float("inf")
_WIN = (56, 56, 56, 56)

# Safe squares in RELATIVE distance. The absolute safe set is invariant under
# +26 (mod 52) and the two starts are 26 apart, so the relative safe set is
# identical for both players (asserted on first instantiation).
SAFE_REL = frozenset({0, 8, 13, 21, 26, 34, 39, 47})

# Deferred initialization: these depend on injected symbols that arrive after
# module load in production (wrapper.py loads user bot, then injects adapter symbols
# on INIT message). Validate them in GameBot.__init__ on first instantiation.
_S1 = _S2 = None
_initialized = False

def _ensure_initialized():
    global _S1, _S2, _initialized
    if _initialized:
        return
    # Verify critical symbols are available
    critical = {"START", "PLAYER_COLOR", "RING_LENGTH"}
    g = globals()
    missing = critical - set(g.keys())
    if missing:
        raise RuntimeError(
            f"Bot loader did not inject required game symbols: {', '.join(sorted(missing))}. "
            f"Wrapper must call setattr for all adapter symbols before instantiating GameBot."
        )
    _S1 = START[PLAYER_COLOR[1]]
    _S2 = START[PLAYER_COLOR[2]]
    assert (_S2 - _S1) % RING_LENGTH == 26
    # Optional validation (skipped if SAFE_RING_INDICES wasn't injected)
    if "SAFE_RING_INDICES" in g:
        for _d in SAFE_REL:
            assert (_S1 + _d) % RING_LENGTH in SAFE_RING_INDICES
            assert (_S2 + _d) % RING_LENGTH in SAFE_RING_INDICES
    _initialized = True

# OPP_OF[d]: opponent-relative distance of the same absolute ring square as my
# relative distance d. (d+26)%52 == 51 has no opponent ring coordinate (their
# ring tops out at 50); encode it as -100 so `OPP_OF[nd] in tokens` can never
# falsely match a home-column distance (51..55).
OPP_OF = [-100 if (d + 26) % 52 == 51 else (d + 26) % 52 for d in range(51)]

# CAN_CAPTURE_AT[nd], nd in 0..56: landing square is on the ring and not safe.
CAN_CAPTURE_AT = [nd <= 50 and nd not in SAFE_REL for nd in range(57)]

# THREAT_MASK[d+1]: bitmask over opponent-relative ring squares whose occupant
# could capture my token sitting at relative distance d with one die roll.
# Threatening squares are OPP_OF[d]-6 .. OPP_OF[d]-1 (clipped at 0). A base
# exit lands on the opponent's own start, which is safe, so exits never
# capture and no wraparound bits are needed. popcount(opp_occupancy & mask)
# equals the number of distinct die values (out of 6) that capture the token,
# even when opponent tokens are stacked.
THREAT_MASK = [0] * 58
for _d in range(1, 51):
    if _d not in SAFE_REL:
        _m = OPP_OF[_d]
        if _m >= 0:
            _mask = 0
            for _k in range(1, 7):
                if _m - _k >= 0:
                    _mask |= 1 << (_m - _k)
            THREAT_MASK[_d + 1] = _mask

try:
    _popcount = int.bit_count
except AttributeError:  # Python < 3.10
    def _popcount(x):
        return bin(x).count("1")

# ----------------------------------------------------------------- evaluation
# Tunable weights. IMPORTANT: _EVAL_MAX/_EVAL_MIN feed Star1 pruning — any
# weight change here requires re-running the empirical bound check
# (eval 1M random states, assert strictly inside the bounds).
_HOME_BONUS = 0       # home column already safe; no extra bonus (A/B tested)
_FINISH_BONUS = 200   # finished token = 56 + 200 = 256 progress points
BASE_PEN = 100.0      # per token sitting in base
VULN_W = 1.0          # weight of my expected capture loss (opponent moves next)
CAP_W = 0.5           # weight of my capture threats (they may dodge first)
RECYCLE = 100         # a capture costs progress + BASE_PEN-equivalent re-entry

# PROGRESS[d+1]: positional value of a token at distance d.
PROGRESS = [0] * 58
for _d in range(0, 51):
    PROGRESS[_d + 1] = _d
for _d in range(51, 56):
    PROGRESS[_d + 1] = _d + _HOME_BONUS
PROGRESS[57] = _FINISH + _FINISH_BONUS

# Tight non-terminal eval bounds used by Star1. Analytic worst case: three
# finished (3x256 = 768) + one at 55 (55) + opponent all in base (400) = 1223;
# the threat-heavy branches cap lower. ±1300 leaves margin and is verified
# empirically by the engine check script (re-run it after ANY weight change
# above). Same caveat as ever: terminals are ±10000, so a forced win/loss
# appearing mid-chance-loop can theoretically violate the remaining-mass
# estimate — accepted, essentially unreachable in real positions.
_EVAL_MAX = 1300.0
_EVAL_MIN = -1300.0

# TT flags
_EXACT, _LOWER, _UPPER = 0, 1, 2
_TT_MAX_ENTRIES = 400000  # ~100-140MB worst case; never expected to fill in 5s

# Self-check switches (flipped by check_fast_engine.py to produce a reference
# search; all True in normal play).
_USE_TT = True
_USE_STAR1 = True
_USE_ASPIRATION = True


class _Timeout(Exception):
    pass


def _apply(mover, other, d, nd, od, dice):
    """Move the mover token at distance d to nd; od is the opponent-relative
    square being captured (or -100). Returns (new_mover, new_other, extra_turn).
    A capture clears ALL opponent tokens stacked on that square."""
    i = mover.index(d)
    nm = tuple(sorted(mover[:i] + mover[i + 1:] + (nd,)))
    if od >= 0:
        no = tuple(sorted(-1 if x == od else x for x in other))
        extra = True
    else:
        no = other
        extra = dice == 6 or nd == 56
    return nm, no, extra


class GameBot:
    MAX_DEPTH = 32          # time is the binding constraint, not depth
    TIME_LIMIT = 1          # seconds per move; search budget is 90% of this

    def __init__(self, player_id: int):
        _ensure_initialized()
        self.player_id = player_id
        self.color = PLAYER_COLOR[player_id]
        self.turn_stats: list = []
        self._tt: dict = {}
        self._ecache: dict = {}   # leaf eval memo; eval dominates leaf cost
        self._deadline = 0.0
        self._nodes = 0

    # ------------------------------------------------------------- evaluation

    def _evaluate(self, p1, p2) -> float:
        if self.player_id == 1:
            my, opp = p1, p2
        else:
            my, opp = p2, p1
        if my == _WIN:
            return 10000.0
        if opp == _WIN:
            return -10000.0
        prog = PROGRESS
        my_prog = 0
        my_base = 0
        my_occ = 0
        for d in my:
            my_prog += prog[d + 1]
            if d < 0:
                my_base += 1
            elif d <= 50:
                my_occ |= 1 << d
        opp_prog = 0
        opp_base = 0
        opp_occ = 0
        for d in opp:
            opp_prog += prog[d + 1]
            if d < 0:
                opp_base += 1
            elif d <= 50:
                opp_occ |= 1 << d
        tm = THREAT_MASK
        my_haz = 0
        if opp_occ:
            for d in my:
                m = tm[d + 1]
                if m:
                    c = _popcount(opp_occ & m)
                    if c:
                        my_haz += c * (d + RECYCLE)
        opp_haz = 0
        if my_occ:
            for d in opp:
                m = tm[d + 1]
                if m:
                    c = _popcount(my_occ & m)
                    if c:
                        opp_haz += c * (d + RECYCLE)
        return (my_prog - opp_prog
                + BASE_PEN * (opp_base - my_base)
                - (VULN_W / 6.0) * my_haz
                + (CAP_W / 6.0) * opp_haz)

    # ------------------------------------------------------------ move gen

    def _ordered_entries(self, mover, other, dice):
        """Distinct legal moves as (prio, -d, d, nd, captured_od) tuples,
        sorted: finish -> capture -> base exit -> descending distance.
        captured_od is the opponent-relative square cleared, or -100."""
        entries = []
        prev = -2
        for d in mover:
            if d == prev:
                continue
            prev = d
            if d < 0:
                if dice == 6:
                    entries.append((2, 0, -1, 0, -100))
            else:
                nd = d + dice
                if nd <= 56:
                    if nd == 56:
                        entries.append((0, -d, d, 56, -100))
                    elif CAN_CAPTURE_AT[nd] and OPP_OF[nd] in other:
                        entries.append((1, -d, d, nd, OPP_OF[nd]))
                    else:
                        entries.append((3, -d, d, nd, -100))
        if len(entries) > 1:
            entries.sort()
        return entries

    # ------------------------------------------------------------- search

    def _decision(self, p1, p2, player, dice, depth, alpha, beta):
        """MAX node (our turn) or MIN node (opponent's). Fail-soft alpha-beta."""
        self._nodes += 1
        if not (self._nodes & 255) and time.monotonic() >= self._deadline:
            raise _Timeout
        if player == 1:
            mover, other = p1, p2
        else:
            mover, other = p2, p1
        entries = self._ordered_entries(mover, other, dice)
        if not entries:
            return self._chance(p1, p2, 3 - player, depth - 1, alpha, beta)
        chance = self._chance
        maximizing = player == self.player_id
        best = -_INF if maximizing else _INF
        for _, _, d, nd, od in entries:
            nm, no, extra = _apply(mover, other, d, nd, od, dice)
            nxt = player if extra else 3 - player
            if player == 1:
                v = chance(nm, no, nxt, depth - 1, alpha, beta)
            else:
                v = chance(no, nm, nxt, depth - 1, alpha, beta)
            if maximizing:
                if v > best:
                    best = v
                    if v > alpha:
                        alpha = v
                        if alpha >= beta:
                            break
            else:
                if v < best:
                    best = v
                    if v < beta:
                        beta = v
                        if alpha >= beta:
                            break
        return best

    def _chance(self, p1, p2, player, depth, alpha, beta):
        """Average over the six dice with Star1 window propagation: each die's
        decision child gets a window derived from what the partial sum still
        allows; the unclipped (cA, cB) thresholds keep the child cut tests
        exact. Star2 probing is deliberately skipped — decision nodes have at
        most 4 (usually 2-3) children, so probing buys almost nothing."""
        if p1 == _WIN:
            return 10000.0 if self.player_id == 1 else -10000.0
        if p2 == _WIN:
            return 10000.0 if self.player_id == 2 else -10000.0
        if depth <= 0:
            ec = self._ecache
            key = (p1, p2)
            v = ec.get(key)
            if v is None:
                v = self._evaluate(p1, p2)
                if len(ec) > _TT_MAX_ENTRIES:
                    ec.clear()
                ec[key] = v
            return v
        tt = self._tt
        key = (p1, p2, player)
        e = tt.get(key)
        if e is not None and e[0] >= depth:
            flag = e[1]
            val = e[2]
            if flag == _EXACT:
                return val
            if flag == _LOWER:
                if val > alpha:
                    alpha = val
            elif val < beta:
                beta = val
            if alpha >= beta:
                return val
        dec = self._decision
        total = 0.0
        if _USE_STAR1:
            value = None
            for k in range(6):
                rem = 5 - k
                cA = 6.0 * alpha - total - rem * _EVAL_MAX
                cB = 6.0 * beta - total - rem * _EVAL_MIN
                v = dec(p1, p2, player, k + 1, depth, cA, cB)
                if v <= cA:           # node can no longer exceed alpha
                    value = alpha
                    flag = _UPPER
                    break
                if v >= cB:           # node already guaranteed >= beta
                    value = beta
                    flag = _LOWER
                    break
                total += v
            else:
                value = total / 6.0
                flag = _EXACT
        else:
            for k in range(6):
                total += dec(p1, p2, player, k + 1, depth, -_INF, _INF)
            value = total / 6.0
            flag = _EXACT
        if _USE_TT:
            if len(tt) > _TT_MAX_ENTRIES:
                tt.clear()
            tt[key] = (depth, flag, value)
        return value

    # --------------------------------------------------------- public interface

    def makeMove(self, state):
        t0 = time.monotonic()
        if not state.legal_moves:
            return NO_MOVE

        pid = self.player_id
        rows = []
        dists = []  # per player, unsorted, aligned with token indices
        for p in (1, 2):
            start = START[PLAYER_COLOR[p]]
            row = []
            for pos in state.tokens[p - 1]:
                if pos.zone == Zone.BASE:
                    row.append(-1)
                elif pos.zone == Zone.RING:
                    row.append((pos.index - start) % RING_LENGTH)
                else:
                    row.append(51 + pos.index)
            dists.append(row)
            rows.append(tuple(sorted(row)))
        p1, p2 = rows
        dice = state.dice

        # Distinct distances only — duplicate-position tokens are one move.
        dist_to_idx = {}
        for i in state.legal_moves:
            dist_to_idx.setdefault(dists[pid - 1][i], i)
        if len(dist_to_idx) == 1:
            self.turn_stats.append(
                {"used_depth": 0, "elapsed": time.monotonic() - t0})
            return next(iter(dist_to_idx.values()))

        self._tt = {}
        self._ecache = {}
        self._deadline = t0 + self.TIME_LIMIT * 0.9
        self._nodes = 0

        if pid == 1:
            mover, other = p1, p2
        else:
            mover, other = p2, p1

        # Pre-apply the root children once; the ID loop only re-searches them.
        children = []
        for _, _, d, nd, od in self._ordered_entries(mover, other, dice):
            nm, no, extra = _apply(mover, other, d, nd, od, dice)
            nxt = pid if extra else 3 - pid
            np1, np2 = (nm, no) if pid == 1 else (no, nm)
            children.append((d, np1, np2, nxt))

        best_d = children[0][0]   # heuristic fallback (depth 1 always commits)
        used_depth = 0
        prev_val = None
        try:
            for depth in range(1, self.MAX_DEPTH + 1):
                if time.monotonic() >= self._deadline:
                    break
                # Alpha-side aspiration: starting near the previous depth's
                # value lets Star1 cut bad root moves immediately. Values
                # above alpha are exact (beta = +inf), so the argmax is sound;
                # if every child fails low we redo with a full window.
                base_alpha = (-_INF if prev_val is None or not _USE_ASPIRATION
                              else prev_val - 64.0)
                while True:
                    alpha = base_alpha
                    cand = None
                    scored = []
                    for child in children:
                        v = self._chance(child[1], child[2], child[3],
                                         depth - 1, alpha, _INF)
                        scored.append((v, child))
                        if v > alpha:
                            alpha = v
                            cand = child[0]
                    if cand is None and base_alpha != -_INF:
                        base_alpha = -_INF   # aspiration failed low: re-search
                        continue
                    break
                best_d = cand
                used_depth = depth
                prev_val = alpha
                # Best-first root order for the next iteration.
                scored.sort(key=lambda s: -s[0])
                children = [c for _, c in scored]
                if alpha >= 10000.0:   # forced win found; no need to go deeper
                    break
        except _Timeout:
            pass

        self.turn_stats.append(
            {"used_depth": used_depth, "elapsed": time.monotonic() - t0})
        return dist_to_idx[best_d]
