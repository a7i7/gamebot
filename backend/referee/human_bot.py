import asyncio
import json
from typing import Any, Callable, Coroutine, Optional

from .exceptions import BotTimeoutError

HUMAN_MOVE_TIMEOUT_S = 60.0


class HumanBotProxy:
    """
    Drop-in replacement for BotProcess for a human player.

    The referee calls start/send/recv_move/kill exactly as it would for a bot.
    send() parses each MOVE message and fires on_human_turn so the API layer
    can write current state to the DB. recv_move() blocks on an asyncio.Event
    until the API layer calls submit_move() with the human's chosen move.
    """

    def __init__(
        self,
        on_human_turn: Optional[Callable[..., Coroutine]] = None,
    ) -> None:
        # Async callback fired when it's the human's turn:
        #   await on_human_turn(board, legal_moves)
        self._on_human_turn = on_human_turn
        self._move_event: asyncio.Event = asyncio.Event()
        self._submitted_move: Any = None

    async def start(self) -> None:
        pass

    async def send(self, message_bytes: bytes) -> None:
        try:
            msg = json.loads(message_bytes.decode().strip())
        except (json.JSONDecodeError, UnicodeDecodeError):
            return
        if msg.get("type") == "MOVE":
            self._submitted_move = None
            self._move_event.clear()
            if self._on_human_turn:
                await self._on_human_turn(msg["board"], msg["legal_moves"])

    async def recv_move(self) -> Any:
        try:
            await asyncio.wait_for(self._move_event.wait(), timeout=HUMAN_MOVE_TIMEOUT_S)
        except asyncio.TimeoutError:
            raise BotTimeoutError("Human did not move within 60 seconds")
        return self._submitted_move

    def submit_move(self, move: Any) -> None:
        self._submitted_move = move
        self._move_event.set()

    async def kill(self) -> None:
        # Unblock recv_move so the referee's finally block doesn't deadlock.
        self._move_event.set()

    @property
    def stderr_log(self) -> str:
        return ""
