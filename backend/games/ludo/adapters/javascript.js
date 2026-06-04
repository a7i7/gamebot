/**
 * Ludo adapter for JavaScript bots.
 *
 * Converts the referee's generic MOVE JSON into a typed LudoState and the
 * bot's return value back into JSON. Exported symbols are injected into the
 * user module's scope by the bootstrapper.
 */
"use strict";

// Sentinel a bot returns when it has no legal move this turn.
const NO_MOVE = "NO_MOVE";

// --- Board geometry ---------------------------------------------------------
const RING_LENGTH = 52;        // shared ring squares, indices 0..51
const HOME_COLUMN_LENGTH = 6;  // private home-column squares, indices 0..5
const FINISH_INDEX = HOME_COLUMN_LENGTH - 1; // HOME_COLUMN index 5 == HOME

// Which part of the board a token sits on.
const Zone = {
  BASE: "BASE",               // in the yard; Position.index == -1
  RING: "RING",               // shared ring; index 0..51 (absolute)
  HOME_COLUMN: "HOME_COLUMN", // private column; index 0..5 (5 = HOME)
};

const Color = { RED: "RED", GREEN: "GREEN", YELLOW: "YELLOW", BLUE: "BLUE" };

// Ring square each color enters on. Player 1 = RED (0), Player 2 = YELLOW (26).
const START = { RED: 0, GREEN: 13, YELLOW: 26, BLUE: 39 };
const PLAYER_COLOR = { 1: Color.RED, 2: Color.YELLOW };

/**
 * Where a single token is, as a { zone, index } pair.
 *
 * The RING uses one SHARED, ABSOLUTE coordinate system (indices 0..51). Two
 * tokens with zone RING and the same index occupy the same physical square —
 * that is how you detect a capture, with no per-color math needed.
 *
 *   zone BASE         index -1       (in the yard)
 *   zone RING         index 0..51    shared/absolute ring square
 *   zone HOME_COLUMN  index 0..5     private to your color; 5 == HOME (done)
 */
class Position {
  constructor(zone, index) {
    this.zone = zone;
    this.index = index;
  }
  get isBase() {
    return this.zone === Zone.BASE;
  }
  get isFinished() {
    return this.zone === Zone.HOME_COLUMN && this.index === FINISH_INDEX;
  }
}

/**
 * The current game state passed to your bot's makeMove() each turn.
 *
 * The referee rolls the die for you and tells you whose turn it is — your only
 * decision is *which* of your tokens to move with that roll.
 *
 *   tokens       Position[][]  tokens[playerIndex][tokenIndex]; yours are
 *                              tokens[player - 1].
 *   dice         number        your roll, 1-6. Need a 6 to leave base; exact
 *                              roll to reach HOME (no overshoot).
 *   turn         number        1-indexed total move count.
 *   player       number        your player ID, 1 or 2.
 *   color        string        your Color (P1 = RED, P2 = YELLOW).
 *   colors       object        { 1: Color, 2: Color } for both players.
 *   lastMove     number|string|null  opponent's last token index, "NO_MOVE",
 *                              or null on the first turn.
 *   legalMoves   number[]      token indices you may move; return one, or NO_MOVE.
 *
 * Capture rule: RING is shared, so your moved token captures iff it lands on a
 * RING square whose index equals an opponent token's RING index. The framework
 * does NOT pre-compute landings — derive them from START[color] if you need to.
 *
 * @example
 *   if (state.legalMoves.length === 0) return NO_MOVE;
 *   const steps = (p) =>
 *     p.zone === Zone.BASE ? -1
 *     : p.zone === Zone.RING ? ((p.index - START[state.color]) % RING_LENGTH)
 *     : 51 + p.index;
 *   const my = state.tokens[state.player - 1];
 *   return state.legalMoves.reduce((a, b) => (steps(my[a]) >= steps(my[b]) ? a : b));
 */
class LudoState {
  constructor(tokens, dice, turn, player, color, colors, lastMove, legalMoves) {
    this.tokens = tokens;
    this.dice = dice;
    this.turn = turn;
    this.player = player;
    this.color = color;
    this.colors = colors;
    this.lastMove = lastMove;
    this.legalMoves = legalMoves;
  }
}

function toPosition(d) {
  return new Position(d.zone, Number(d.index));
}

function fromJson(playerId, msg) {
  const board = msg.board;
  const tokens = board.tokens.map((row) => row.map(toPosition));
  const colors = {};
  for (const [k, v] of Object.entries(board.colors)) colors[Number(k)] = v;
  const lm = msg.last_move;
  const lastMove = lm ? lm.move : null;
  const legalMoves = msg.legal_moves.map((i) => Number(i));
  return new LudoState(
    tokens,
    Number(board.dice),
    msg.turn,
    playerId,
    colors[playerId],
    colors,
    lastMove,
    legalMoves
  );
}

function toJson(move) {
  if (move === NO_MOVE) return "NO_MOVE";
  return Number(move);
}

module.exports = {
  NO_MOVE,
  RING_LENGTH,
  HOME_COLUMN_LENGTH,
  FINISH_INDEX,
  Zone,
  Color,
  START,
  PLAYER_COLOR,
  Position,
  LudoState,
  fromJson,
  toJson,
};
