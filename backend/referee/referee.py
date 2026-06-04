import asyncio
import uuid
from typing import Optional

from .bot_process import BotProcess
from .protocol import InitMessage, MoveMessage, EndMessage
from .result import MatchResult
from .exceptions import BotTimeoutError, BotOOMError, BotCrashError, InvalidMoveError


class Referee:
    """
    Orchestrates a 1v1 game between two bots.

        result = await Referee(game, bot1_config, bot2_config).run()

    Each bot_config is a dict with keys:
        image (str)  — Docker image name
        file  (str)  — absolute path to the user's bot file on the host
    """

    def __init__(self, game, bot1_config: dict, bot2_config: dict, verbose: bool = False):
        self.game = game
        self.verbose = verbose
        match_id = uuid.uuid4().hex[:8]
        self.bots = [
            BotProcess(
                container_image=cfg["image"],
                bot_file_path=cfg["file"],
                container_name=f"gamebot-{match_id}-p{i + 1}",
                protocol_on_stderr=cfg.get("protocol_on_stderr", False),
            )
            for i, cfg in enumerate([bot1_config, bot2_config])
        ]

    async def run(self) -> MatchResult:
        await asyncio.gather(self.bots[0].start(), self.bots[1].start())

        state = self.game.initial_state()
        config = self.game.config()

        init_results = await asyncio.gather(
            self.bots[0].send(InitMessage(player=1, game=self.game.name, config=config).encode()),
            self.bots[1].send(InitMessage(player=2, game=self.game.name, config=config).encode()),
            return_exceptions=True,
        )
        for i, result in enumerate(init_results):
            if isinstance(result, Exception):
                return self._forfeit(i, "crash", 0, state)

        turn = 0
        last_move = None
        current = 0  # index: 0 = player 1, 1 = player 2

        try:
            while not self.game.is_terminal(state):
                turn += 1
                bot = self.bots[current]
                player_id = current + 1

                # Optional per-turn setup hook (e.g. Ludo rolls the die here).
                # No-op for games that don't define it (e.g. TicTacToe).
                if hasattr(self.game, "start_turn"):
                    state = self.game.start_turn(state)

                legal = self.game.legal_moves(state)

                try:
                    await bot.send(MoveMessage(
                        turn=turn,
                        board=self.game.board_repr(state),
                        last_move=last_move,
                        legal_moves=legal,
                    ).encode())
                    move = await bot.recv_move()
                except BotTimeoutError:
                    return self._forfeit(current, "timeout", turn, state)
                except BotOOMError:
                    return self._forfeit(current, "oom", turn, state)
                except BotCrashError:
                    return self._forfeit(current, "crash", turn, state)

                if not self.game.is_valid_move(state, move, player_id):
                    return self._forfeit(current, "invalid_move", turn, state)

                state = self.game.apply_move(state, move, player_id)
                last_move = {"player": player_id, "move": move}

                if self.verbose:
                    symbol = "X" if player_id == 1 else "O"
                    print(f"\nTurn {turn}  Player {player_id} ({symbol}) plays {move}")
                    if hasattr(self.game, "format_board"):
                        print(self.game.format_board(state))

                # The game decides who moves next via state.next_player (Ludo
                # gives the same player another turn on a 6). For TicTacToe this
                # is 3 - player, identical to the old 1 - current alternation.
                current = state.next_player - 1

        finally:
            await self._send_end_messages(state, turn)
            await asyncio.gather(
                self.bots[0].kill(), self.bots[1].kill(),
                return_exceptions=True,
            )

        return self._normal_result(state, turn)

    # ------------------------------------------------------------------

    def _forfeit(self, loser_idx: int, reason: str, turn: int, state) -> MatchResult:
        winner_idx = 1 - loser_idx
        return MatchResult(
            winner_player=winner_idx + 1,
            loser_player=loser_idx + 1,
            reason=reason,
            turn=turn,
            board=self.game.board_repr(state),
            bot_logs=[b.stderr_log for b in self.bots],
        )

    def _normal_result(self, state, turn: int) -> MatchResult:
        winner = self.game.winner(state)
        return MatchResult(
            winner_player=winner,
            loser_player=(3 - winner) if winner else None,
            reason="game_over",
            turn=turn,
            board=self.game.board_repr(state),
            bot_logs=[b.stderr_log for b in self.bots],
        )

    async def _send_end_messages(self, state, turn: int):
        winner = self.game.winner(state)
        board = self.game.board_repr(state)

        def outcome_for(player_id: int):
            if winner is None:
                return "DRAW", "board_full"
            return ("WIN" if winner == player_id else "LOSS"), "game_over"

        sends = []
        for i, bot in enumerate(self.bots):
            result, reason = outcome_for(i + 1)
            sends.append(bot.send(EndMessage(
                turn=turn, result=result, reason=reason, board=board,
            ).encode()))

        await asyncio.gather(*sends, return_exceptions=True)
