"""
End-to-end test of the Python bootstrapper without Docker.
Runs wrapper.py as a subprocess against example bots and fixtures.
"""
import json
import os
import subprocess
import sys
import pytest

REPO_ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WRAPPER     = os.path.join(REPO_ROOT, "bootstrappers", "python", "wrapper.py")
RANDOM_BOT  = os.path.join(REPO_ROOT, "examples", "tictactoe", "python", "random_bot.py")
CRASH_BOT   = os.path.join(REPO_ROOT, "tests", "fixtures", "crash_bot.py")
INVALID_BOT = os.path.join(REPO_ROOT, "tests", "fixtures", "invalid_move_bot.py")

INIT_MSG = json.dumps({"type": "INIT", "player": 1, "game": "tictactoe", "config": {"board_size": 3}}) + "\n"
MOVE_MSG = json.dumps({
    "type": "MOVE", "turn": 1,
    "board": [[0,0,0],[0,0,0],[0,0,0]],
    "last_move": None,
    "legal_moves": [[r, c] for r in range(3) for c in range(3)],
}) + "\n"
END_MSG  = json.dumps({"type": "END", "turn": 1, "result": "WIN", "reason": "test", "board": []}) + "\n"


def run_wrapper(bot_file: str, messages: list[str], timeout: float = 5.0):
    proc = subprocess.run(
        [sys.executable, WRAPPER, bot_file],
        input="".join(messages).encode(),
        capture_output=True,
        timeout=timeout,
        env={**os.environ, "PYTHONPATH": REPO_ROOT},
    )
    return proc


def test_random_bot_responds_to_move():
    proc = run_wrapper(RANDOM_BOT, [INIT_MSG, MOVE_MSG, END_MSG])
    assert proc.returncode == 0
    lines = [l for l in proc.stdout.decode().splitlines() if l.strip()]
    assert len(lines) == 1
    response = json.loads(lines[0])
    assert "move" in response
    move = response["move"]
    assert isinstance(move, list) and len(move) == 2
    assert all(0 <= x <= 2 for x in move)


def test_random_bot_multiple_moves():
    board = [[0,0,0],[0,0,0],[0,0,0]]
    msgs = [INIT_MSG]
    # Play 3 moves in sequence.
    for i in range(3):
        msgs.append(json.dumps({
            "type": "MOVE", "turn": i + 1,
            "board": board,
            "last_move": None,
            "legal_moves": [[r, c] for r in range(3) for c in range(3)],
        }) + "\n")
    msgs.append(END_MSG)
    proc = run_wrapper(RANDOM_BOT, msgs)
    assert proc.returncode == 0
    lines = [l for l in proc.stdout.decode().splitlines() if l.strip()]
    assert len(lines) == 3


def test_crash_bot_exits_nonzero():
    proc = run_wrapper(CRASH_BOT, [INIT_MSG, MOVE_MSG])
    assert proc.returncode != 0


def test_invalid_move_bot_returns_bad_move():
    proc = run_wrapper(INVALID_BOT, [INIT_MSG, MOVE_MSG, END_MSG])
    assert proc.returncode == 0
    lines = [l for l in proc.stdout.decode().splitlines() if l.strip()]
    assert len(lines) == 1
    move = json.loads(lines[0])["move"]
    assert move == [99, 99]


def test_unknown_message_type_ignored():
    unknown = json.dumps({"type": "UNKNOWN_FUTURE_MSG", "data": 42}) + "\n"
    proc = run_wrapper(RANDOM_BOT, [INIT_MSG, unknown, MOVE_MSG, END_MSG])
    assert proc.returncode == 0
    lines = [l for l in proc.stdout.decode().splitlines() if l.strip()]
    assert len(lines) == 1  # Only one MOVE response, unknown ignored.
