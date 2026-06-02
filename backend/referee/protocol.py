import json
from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class InitMessage:
    player: int
    game: str
    config: dict

    def encode(self) -> bytes:
        return (json.dumps({
            "type": "INIT",
            "player": self.player,
            "game": self.game,
            "config": self.config,
        }) + "\n").encode()


@dataclass
class MoveMessage:
    turn: int
    board: Any
    last_move: Optional[dict]
    legal_moves: list

    def encode(self) -> bytes:
        return (json.dumps({
            "type": "MOVE",
            "turn": self.turn,
            "board": self.board,
            "last_move": self.last_move,
            "legal_moves": self.legal_moves,
        }) + "\n").encode()


@dataclass
class EndMessage:
    turn: int
    result: str   # "WIN" | "LOSS" | "DRAW"
    reason: str
    board: Any

    def encode(self) -> bytes:
        return (json.dumps({
            "type": "END",
            "turn": self.turn,
            "result": self.result,
            "reason": self.reason,
            "board": self.board,
        }) + "\n").encode()


def parse_bot_response(raw: bytes) -> Any:
    text = raw.decode(errors="replace").strip()
    try:
        msg = json.loads(text)
    except json.JSONDecodeError:
        from .exceptions import BotCrashError
        raise BotCrashError(f"Bot returned invalid JSON: {text!r}")
    return msg["move"]
