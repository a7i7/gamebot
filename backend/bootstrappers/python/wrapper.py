#!/usr/bin/env python3
"""
Generic Python bootstrapper.

Invoked as: python3 wrapper.py <bot_file.py>

The user's file must define a class named GameBot:
    class GameBot:
        def __init__(self, player_id: int): ...
        def makeMove(self, state) -> Move: ...

The wrapper reads the game name from the INIT message, loads the
matching game adapter, injects its types into the user's module
namespace, and drives the stdin/stdout loop.
"""
import sys
import json
import importlib
import importlib.util
from importlib.machinery import SourceFileLoader
import traceback


def load_user_module(path: str):
    import os
    if not os.path.isfile(path):
        sys.stderr.write(f"[wrapper] bot file not found at {path!r}\n")
        sys.stderr.write(f"[wrapper] /bot contents: {os.listdir('/bot') if os.path.isdir('/bot') else 'no /bot dir'}\n")
        sys.exit(1)
    # Explicitly pass SourceFileLoader so the file extension is irrelevant.
    # The mounted file is named "user_bot" with no .py extension.
    spec = importlib.util.spec_from_file_location(
        "user_bot", path, loader=SourceFileLoader("user_bot", path)
    )
    mod = importlib.util.module_from_spec(spec)
    sys.modules["user_bot"] = mod
    spec.loader.exec_module(mod)
    return mod


def load_adapter(game_name: str):
    # e.g. "tictactoe" -> games.tictactoe.adapters.python
    return importlib.import_module(f"games.{game_name}.adapters.python")


def main():
    if len(sys.argv) < 2:
        sys.stderr.write("usage: wrapper.py <bot_file.py>\n")
        sys.exit(1)

    user_mod = load_user_module(sys.argv[1])
    bot = None
    adapter = None
    player_id = None

    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue

        try:
            msg = json.loads(raw)
        except json.JSONDecodeError as e:
            sys.stderr.write(f"[wrapper] bad JSON: {e}\n")
            continue

        msg_type = msg.get("type")

        if msg_type == "INIT":
            adapter = load_adapter(msg["game"])
            player_id = msg["player"]
            # Inject adapter's public symbols into the user module so the
            # user can write `from tictactoe import Move, Cell` etc.
            for name in dir(adapter):
                if not name.startswith("_"):
                    setattr(user_mod, name, getattr(adapter, name))
            bot = user_mod.GameBot(player_id)

        elif msg_type == "MOVE":
            if bot is None:
                sys.stderr.write("[wrapper] received MOVE before INIT\n")
                sys.exit(1)
            try:
                state = adapter.from_json(player_id, msg)
                move = bot.makeMove(state)
                response = json.dumps({"move": adapter.to_json(move)})
                sys.stdout.write(response + "\n")
                sys.stdout.flush()
            except Exception:
                sys.stderr.write(traceback.format_exc())
                sys.exit(1)

        elif msg_type == "END":
            sys.exit(0)

        # Unknown message types are silently ignored (forward-compatibility).


if __name__ == "__main__":
    main()
