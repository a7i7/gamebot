/**
 * Represents a cell value on the TicTacToe board.
 *
 * Use these constants instead of magic numbers when inspecting the board:
 *   - EMPTY: Cell is unoccupied
 *   - P1:    Cell is occupied by player 1
 *   - P2:    Cell is occupied by player 2
 *
 * Example:
 *   if (state.board[0][0] == Cell.EMPTY) {
 *       // top-left corner is empty
 *   }
 *   if (state.board[1][1] == Cell.P1) {
 *       // you own the center
 *   }
 */
public class Cell {
    /** Cell is unoccupied. */
    public static final int EMPTY = 0;
    /** Cell is occupied by player 1. */
    public static final int P1 = 1;
    /** Cell is occupied by player 2. */
    public static final int P2 = 2;

    private Cell() {
        // Utility class, not meant to be instantiated
    }
}
