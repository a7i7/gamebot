from dataclasses import dataclass, field
from typing import Optional


@dataclass
class MatchResult:
    winner_player: Optional[int]  # 1 or 2; None = draw
    loser_player: Optional[int]
    reason: str  # "game_over" | "timeout" | "oom" | "crash" | "invalid_move"
    turn: int
    board: object
    bot_logs: list = field(default_factory=list)

    @property
    def is_draw(self) -> bool:
        return self.winner_player is None
