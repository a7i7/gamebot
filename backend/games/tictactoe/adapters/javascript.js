/**
 * TicTacToe adapter for JavaScript bots.
 *
 * Converts the referee's generic MOVE JSON into typed objects and the
 * bot's return value back into JSON. Exported symbols are injected into
 * the user module's scope by the bootstrapper.
 */
"use strict";

/**
 * Represents a single TicTacToe move (placing a mark on the board).
 */
class Move {
  /**
   * @param {number} row - Row index (0-2) on the board
   * @param {number} col - Column index (0-2) on the board
   */
  constructor(row, col) {
    this.row = row;
    this.col = col;
  }

  toArray() {
    return [this.row, this.col];
  }
}

/**
 * Represents board cell values in TicTacToe.
 * @enum {number}
 */
const Cell = {
  EMPTY: 0,  // Cell is unoccupied
  P1: 1,     // Cell is occupied by player 1
  P2: 2      // Cell is occupied by player 2
};

/**
 * The current game state passed to your bot's makeMove() method.
 *
 * This object contains everything your bot needs to know about the game:
 * the board layout, whose turn it is, what moves are legal, and what
 * the opponent just played.
 */
class TicTacToeState {
  /**
   * @param {number[][]} board       - 3x3 grid where each cell is 0 (EMPTY), 1 (P1), or 2 (P2).
   *                                   Access via board[row][col] where row/col are 0-2.
   * @param {number}     turn        - 1-indexed count of total moves played (1 = you move first).
   * @param {number}     player      - Your player ID (1 or 2).
   *                                   If board[r][c] === player, that cell is yours.
   *                                   If board[r][c] !== 0 and !== player, opponent owns it.
   * @param {Move|null}  lastMove    - Opponent's most recent move, or null on your first turn.
   * @param {Move[]}     legalMoves  - Array of all valid Move objects you can make.
   *                                   Your makeMove() must return one of these.
   *
   * @example
   *   // Inspect the board
   *   if (state.board[0][0] === Cell.EMPTY) {
   *       // top-left corner is empty
   *   }
   *
   *   // See if you can take the center
   *   if (state.board[1][1] === Cell.P1) {
   *       // you already own the center
   *   }
   *
   *   // Make a move
   *   return new Move(0, 0);  // top-left corner
   */
  constructor(board, turn, player, lastMove, legalMoves) {
    /** @type {number[][]} The 3x3 board state */
    this.board = board;
    /** @type {number} 1-indexed move count */
    this.turn = turn;
    /** @type {number} Your player ID (1 or 2) */
    this.player = player;
    /** @type {Move|null} Opponent's last move, or null */
    this.lastMove = lastMove;
    /** @type {Move[]} Legal moves available to you */
    this.legalMoves = legalMoves;
  }
}

function fromJson(playerId, msg) {
  const lm = msg.last_move;
  const lastMove = lm ? new Move(lm.move[0], lm.move[1]) : null;
  const legalMoves = msg.legal_moves.map(([r, c]) => new Move(r, c));
  return new TicTacToeState(msg.board, msg.turn, playerId, lastMove, legalMoves);
}

function toJson(move) {
  if (move instanceof Move) return [move.row, move.col];
  return Array.isArray(move) ? move : [move.row, move.col];
}

module.exports = { Move, TicTacToeState, fromJson, toJson };
