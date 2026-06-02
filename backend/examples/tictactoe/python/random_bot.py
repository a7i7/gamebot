"""
TicTacToe random bot — Python example.

This example shows how to implement a simple bot that makes random legal moves.

The game framework automatically injects TicTacToeState, Move, and Cell
into this module's namespace, so you can use them directly without importing.

To implement your own bot:
  1. Rename GameBot to whatever you'd like
  2. In makeMove(), read state and return a Move object
  3. The move must be in state.legal_moves (or the game will reject it)
"""
import random


class GameBot:
    """Your bot implementation for TicTacToe."""

    def __init__(self, player_id: int):
        """Initialize your bot.

        Args:
            player_id: Your player ID (1 or 2). You're player 1 if you move first.
        """
        self.player_id = player_id

    def makeMove(self, state: "TicTacToeState") -> "Move":
        """Decide your next move given the current game state.

        Args:
            state: A TicTacToeState object containing:
                - state.board        : 3x3 grid (access as state.board[row][col])
                - state.player       : Your player ID (1 or 2)
                - state.turn         : How many moves have been played (1-indexed)
                - state.last_move    : Opponent's last Move, or None on your first turn
                - state.legal_moves  : Tuple of all valid Move(row,col) options for you

        Returns:
            A Move object from state.legal_moves indicating where to place your mark.
            Return an invalid move and the game will disqualify you.

        Example:
            To place your mark in the top-left corner:
                return Move(0, 0)

            To inspect the board:
                if state.board[1][1] == Cell.EMPTY:
                    can_take_center = True
        """
        # This simple bot picks a random legal move
        return random.choice(state.legal_moves)
