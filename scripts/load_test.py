#!/usr/bin/env python3
"""
Load test: fire N concurrent submissions and poll until all complete.

Required env vars:
  BASE_URL     e.g. http://1.2.3.4:8000
  LT_USERNAME  account username or email
  LT_PASSWORD  account password

Optional:
  LT_N         number of submissions (default: 10)
  LT_TIMEOUT   seconds before giving up on polling (default: 300)

Run:
  pip install httpx
  BASE_URL=http://... LT_USERNAME=... LT_PASSWORD=... python scripts/load_test.py
"""

import asyncio
import os
import sys
import time

try:
    import httpx
except ImportError:
    sys.exit("Missing dependency: pip install httpx")

# ---------------------------------------------------------------------------
# Bot code submitted to the API — hard minimax tictactoe bot.
# The referee instantiates GameBot(player_id) and calls bot.makeMove(state).
# ---------------------------------------------------------------------------
BOT_CODE = '''
class GameBot:
    def __init__(self, player_id: int):
        self.player_id = player_id
        self._opponent = 3 - player_id

    def makeMove(self, state):
        if len(state.legal_moves) == 9:
            return next(m for m in state.legal_moves if m.row == 1 and m.col == 1)
        best_score = float("-inf")
        best_move = state.legal_moves[0]
        board = state.board
        alpha = float("-inf")
        for move in state.legal_moves:
            new_board = _apply_move(board, move.row, move.col, self.player_id)
            score = _minimax(new_board, 1, False, self.player_id, self._opponent, alpha, float("inf"))
            if score > best_score:
                best_score = score
                best_move = move
            alpha = max(alpha, best_score)
        return best_move


def _check_winner(board):
    lines = [
        [(0,0),(0,1),(0,2)], [(1,0),(1,1),(1,2)], [(2,0),(2,1),(2,2)],
        [(0,0),(1,0),(2,0)], [(0,1),(1,1),(2,1)], [(0,2),(1,2),(2,2)],
        [(0,0),(1,1),(2,2)], [(0,2),(1,1),(2,0)],
    ]
    for line in lines:
        vals = [board[r][c] for r, c in line]
        if vals[0] != 0 and vals[0] == vals[1] == vals[2]:
            return vals[0]
    return None


def _apply_move(board, row, col, player):
    return tuple(
        tuple(player if (r == row and c == col) else board[r][c] for c in range(3))
        for r in range(3)
    )


def _minimax(board, depth, is_maximizing, bot, opp, alpha, beta):
    winner = _check_winner(board)
    if winner == bot:
        return 10 - depth
    if winner == opp:
        return depth - 10
    empty = [(r, c) for r in range(3) for c in range(3) if board[r][c] == 0]
    if not empty:
        return 0
    if is_maximizing:
        best = float("-inf")
        for r, c in empty:
            score = _minimax(_apply_move(board, r, c, bot), depth + 1, False, bot, opp, alpha, beta)
            best = max(best, score)
            alpha = max(alpha, best)
            if alpha >= beta:
                break
        return best
    else:
        best = float("inf")
        for r, c in empty:
            score = _minimax(_apply_move(board, r, c, opp), depth + 1, True, bot, opp, alpha, beta)
            best = min(best, score)
            beta = min(beta, best)
            if alpha >= beta:
                break
        return best
'''.strip()


def _env(key: str, default: str | None = None) -> str:
    val = os.environ.get(key, default)
    if val is None:
        sys.exit(f"Missing required env var: {key}")
    return val


async def login(client: httpx.AsyncClient, base: str, username: str, password: str) -> str:
    r = await client.post(f"{base}/auth/login", json={"identifier": username, "password": password})
    if r.status_code != 200:
        sys.exit(f"Login failed ({r.status_code}): {r.text}")
    token = r.json()["access_token"]
    print(f"[auth] Logged in as {username!r}")
    return token


async def health_check(client: httpx.AsyncClient, base: str) -> None:
    try:
        r = await client.get(f"{base}/health", timeout=10)
        r.raise_for_status()
        print(f"[health] {r.json()}")
    except Exception as e:
        sys.exit(f"Backend unreachable at {base}: {e}")


async def submit(client: httpx.AsyncClient, base: str, headers: dict, idx: int) -> tuple[int, str, float]:
    t0 = time.monotonic()
    r = await client.post(
        f"{base}/submissions",
        json={"game": "tictactoe", "code": BOT_CODE, "lang": "python"},
        headers=headers,
        timeout=30,
    )
    if r.status_code != 202:
        print(f"  [{idx:02d}] FAILED to submit ({r.status_code}): {r.text[:120]}")
        return idx, "", time.monotonic() - t0
    sid = r.json()["submission_id"]
    print(f"  [{idx:02d}] submitted → {sid}")
    return idx, sid, time.monotonic() - t0


async def poll_until_done(
    client: httpx.AsyncClient,
    base: str,
    headers: dict,
    idx: int,
    sid: str,
    start: float,
    timeout: float,
) -> dict:
    while True:
        elapsed = time.monotonic() - start
        if elapsed > timeout:
            return {"idx": idx, "sid": sid, "status": "timeout", "score": None,
                    "wins": None, "draws": None, "losses": None, "elapsed": elapsed}
        await asyncio.sleep(3)
        try:
            r = await client.get(f"{base}/submissions/{sid}", headers=headers, timeout=15)
            if r.status_code != 200:
                continue
            data = r.json()
            status = data.get("status", "unknown")
            if status in ("completed", "failed"):
                elapsed = time.monotonic() - start
                print(f"  [{idx:02d}] {status} in {elapsed:.1f}s — score={data.get('score')}")
                return {
                    "idx": idx,
                    "sid": sid,
                    "status": status,
                    "score": data.get("score"),
                    "wins": data.get("wins"),
                    "draws": data.get("draws"),
                    "losses": data.get("losses"),
                    "matches_completed": data.get("matches_completed"),
                    "total_matches": data.get("total_matches"),
                    "elapsed": elapsed,
                }
        except Exception:
            continue


def print_results(results: list[dict]) -> None:
    print("\n" + "=" * 72)
    print(f"{'#':>3}  {'submission_id':<36}  {'status':<10}  {'score':>6}  "
          f"{'W':>3} {'D':>3} {'L':>3}  {'elapsed':>8}")
    print("-" * 72)
    scores = []
    for r in sorted(results, key=lambda x: x["idx"]):
        score_str = f"{r['score']:.1f}" if r["score"] is not None else "—"
        w = r.get("wins", "—") if r.get("wins") is not None else "—"
        d = r.get("draws", "—") if r.get("draws") is not None else "—"
        l = r.get("losses", "—") if r.get("losses") is not None else "—"
        print(f"{r['idx']:>3}  {r['sid']:<36}  {r['status']:<10}  {score_str:>6}  "
              f"{str(w):>3} {str(d):>3} {str(l):>3}  {r['elapsed']:>7.1f}s")
        if r["score"] is not None:
            scores.append(r["score"])
    print("=" * 72)
    completed = sum(1 for r in results if r["status"] == "completed")
    failed = sum(1 for r in results if r["status"] == "failed")
    timed_out = sum(1 for r in results if r["status"] == "timeout")
    print(f"\nCompleted: {completed}  Failed: {failed}  Timed-out: {timed_out}")
    if scores:
        print(f"Score     avg={sum(scores)/len(scores):.1f}  "
              f"min={min(scores):.1f}  max={max(scores):.1f}")
    total_elapsed = max(r["elapsed"] for r in results)
    print(f"Wall time: {total_elapsed:.1f}s")


async def main() -> None:
    # base = _env("BASE_URL").rstrip("/")
    base = "https://54.176.186.11.nip.io"
    # username = _env("LT_USERNAME")
    username = "a7i7"
    # password = _env("LT_PASSWORD")
    password = "Holmgang23##"
    # n = int(os.environ.get("LT_N", "10"))
    n = 20
    timeout = float(os.environ.get("LT_TIMEOUT", "300"))

    print(f"\nLoad test: {n} submissions → {base}\n")

    async with httpx.AsyncClient() as client:
        await health_check(client, base)
        token = await login(client, base, username, password)
        headers = {"Authorization": f"Bearer {token}"}

        print(f"\n[submit] Firing {n} submissions concurrently...")
        fire_start = time.monotonic()
        submit_results = await asyncio.gather(
            *[submit(client, base, headers, i + 1) for i in range(n)]
        )
        print(f"[submit] All {n} requests sent in {time.monotonic() - fire_start:.2f}s")

        valid = [(idx, sid, t) for idx, sid, t in submit_results if sid]
        if not valid:
            sys.exit("No submissions succeeded.")

        print(f"\n[poll] Waiting for {len(valid)} submissions to complete (timeout={timeout}s)...")
        poll_start = time.monotonic()
        results = await asyncio.gather(
            *[poll_until_done(client, base, headers, idx, sid, poll_start, timeout)
              for idx, sid, _ in valid]
        )

    print_results(list(results))


if __name__ == "__main__":
    asyncio.run(main())
