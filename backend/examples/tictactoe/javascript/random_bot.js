/**
 * TicTacToe random bot — JavaScript example.
 *
 * This example shows how to implement a simple bot that makes random legal moves.
 *
 * The game framework automatically injects TicTacToeState, Move, and Cell
 * into this module's scope, so you can use them directly without importing.
 *
 * To implement your own bot:
 *   1. Rename GameBot to whatever you'd like
 *   2. In makeMove(), read state and return a Move object
 *   3. The move must be in state.legalMoves (or the game will reject it)
 */

class GameBot {
  /**
   * Initialize your bot.
   *
   * @param {number} playerId - Your player ID (1 or 2).
   *                            You're player 1 if you move first.
   */
  constructor(playerId) {
    this.playerId = playerId;
  }

  /**
   * Decide your next move given the current game state.
   *
   * @param {TicTacToeState} state - The current game state containing:
   *   - state.board:      3x3 grid (access as state.board[row][col])
   *   - state.player:     Your player ID (1 or 2)
   *   - state.turn:       How many moves have been played (1-indexed)
   *   - state.lastMove:   Opponent's last Move, or null on your first turn
   *   - state.legalMoves: Array of all valid Move options for you
   *
   * @returns {Move} A Move object from state.legalMoves indicating where
   *                 to place your mark. Return an invalid move and the
   *                 game will disqualify you.
   *
   * @example
   *   // To place your mark in the top-left corner:
   *   return new Move(0, 0);
   *
   *   // To inspect the board:
   *   if (state.board[1][1] === 0) {
   *       // center is empty
   *   }
   *
   *   // To see opponent's last move:
   *   if (state.lastMove) {
   *       console.log(`Opponent played at (${state.lastMove.row}, ${state.lastMove.col})`);
   *   }
   */
  makeMove(state) {
    // This simple bot picks a random legal move
    const legal = state.legalMoves;
    return legal[Math.floor(Math.random() * legal.length)];
  }
}

module.exports = { GameBot };
