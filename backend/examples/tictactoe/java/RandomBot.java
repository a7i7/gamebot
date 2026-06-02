import java.util.Random;

/**
 * TicTacToe random bot — Java example.
 *
 * This example shows how to implement a simple bot that makes random legal moves.
 *
 * The game framework automatically injects TicTacToeState and Move
 * into the classpath, so you can use them directly.
 *
 * To implement your own bot:
 *   1. Rename RandomBot to whatever you'd like
 *   2. Implement makeMove(TicTacToeState state) to return a Move
 *   3. The move must be in state.legalMoves (or the game will reject it)
 */
public class RandomBot {
    /** Your player ID (1 or 2). Set during initialization. */
    private final int playerId;
    private final Random rng = new Random();

    /**
     * Initialize your bot.
     *
     * @param playerId Your player ID (1 or 2).
     *                 You're player 1 if you move first.
     */
    public RandomBot(int playerId) {
        this.playerId = playerId;
    }

    /**
     * Decide your next move given the current game state.
     *
     * @param state The current game state containing:
     *   - state.board:       3x3 grid (access as state.board[row][col])
     *   - state.player:      Your player ID (1 or 2)
     *   - state.turn:        How many moves have been played (1-indexed)
     *   - state.lastMove:    Opponent's last Move, or null on your first turn
     *   - state.legalMoves:  List of all valid Move options for you
     *
     * @return A Move object from state.legalMoves indicating where to place
     *         your mark. Return an invalid move and the game will disqualify you.
     *
     * @example
     *   // To place your mark in the top-left corner:
     *   return new Move(0, 0);
     *
     *   // To inspect the board:
     *   if (state.board[1][1] == Cell.EMPTY) {
     *       // center is empty, you could take it
     *   }
     *   if (state.board[1][1] == Cell.P1) {
     *       // player 1 owns the center
     *   }
     *   if (state.board[1][1] == state.player) {
     *       // you own the center
     *   }
     *
     *   // To see opponent's last move:
     *   if (state.lastMove != null) {
     *       System.out.println("Opponent played at (" +
     *           state.lastMove.row + ", " + state.lastMove.col + ")");
     *   }
     */
    public Move makeMove(TicTacToeState state) {
        // This simple bot picks a random legal move from the available options
        return state.legalMoves.get(rng.nextInt(state.legalMoves.size()));
    }
}
