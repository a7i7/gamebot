import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * The current game state passed to GameBot.makeMove().
 *
 * This object contains everything your bot needs to know about the game:
 * the board layout, whose turn it is, what moves are legal, and what
 * the opponent just played.
 *
 * Board cell values:
 *   0 = EMPTY (unoccupied)
 *   1 = P1    (player 1's mark)
 *   2 = P2    (player 2's mark)
 *
 * Example:
 *   if (state.board[0][0] == 0) {
 *       // top-left corner is empty
 *   }
 *   if (state.board[1][1] == state.player) {
 *       // you own the center
 *   }
 */
public class TicTacToeState {
    /** 3x3 board where each cell is 0 (empty), 1 (player 1), or 2 (player 2).
     *  Access via board[row][col] where row/col are 0-2. */
    public final int[][] board;

    /** 1-indexed count of total moves played so far.
     *  Turn 1 = you're making the first move.
     *  Turn 2 = opponent moved, now you move. */
    public final int turn;

    /** Your player ID (1 or 2).
     *  If board[r][c] == this value, that cell is yours. */
    public final int player;

    /** Opponent's most recent move, or null on your first turn.
     *  After the first move, always contains a Move(row, col) showing
     *  where the opponent last played. */
    public final Move lastMove;

    /** Pre-computed list of all legal moves available to you.
     *  Your makeMove() must return one of these Move objects or the game
     *  will disqualify you. */
    public final List<Move> legalMoves;

    public TicTacToeState(int[][] board, int turn, int player, Move lastMove, List<Move> legalMoves) {
        this.board = board;
        this.turn = turn;
        this.player = player;
        this.lastMove = lastMove;
        this.legalMoves = Collections.unmodifiableList(legalMoves);
    }

    /** Build a TicTacToeState from the referee's MOVE JSON message. */
    public static TicTacToeState fromJson(int playerId, JSONObject msg) {
        JSONArray rawBoard = msg.getJSONArray("board");
        int size = rawBoard.length();
        int[][] board = new int[size][size];
        for (int r = 0; r < size; r++) {
            JSONArray row = rawBoard.getJSONArray(r);
            for (int c = 0; c < size; c++) {
                board[r][c] = row.getInt(c);
            }
        }

        Move lastMove = null;
        if (!msg.isNull("last_move")) {
            JSONObject lm = msg.getJSONObject("last_move");
            lastMove = Move.fromJson(lm.getJSONArray("move"));
        }

        JSONArray rawLegal = msg.getJSONArray("legal_moves");
        List<Move> legalMoves = new ArrayList<>();
        for (int i = 0; i < rawLegal.length(); i++) {
            legalMoves.add(Move.fromJson(rawLegal.getJSONArray(i)));
        }

        return new TicTacToeState(board, msg.getInt("turn"), playerId, lastMove, legalMoves);
    }
}
