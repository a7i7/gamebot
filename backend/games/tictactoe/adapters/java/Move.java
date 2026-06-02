import org.json.JSONArray;

/**
 * Represents a single TicTacToe move: a (row, col) pair.
 * Place your mark at the specified board position and return it from
 * GameBot.makeMove(). The move must be in TicTacToeState.legalMoves
 * or the game will disqualify you.
 */
public class Move {
    /** Row index on the board (0-2: top, middle, bottom). */
    public final int row;
    /** Column index on the board (0-2: left, middle, right). */
    public final int col;

    public Move(int row, int col) {
        this.row = row;
        this.col = col;
    }

    /** Deserialise from a JSON array [row, col]. */
    public static Move fromJson(JSONArray arr) {
        return new Move(arr.getInt(0), arr.getInt(1));
    }

    /** Serialise to a JSON array [row, col]. */
    public JSONArray toJson() {
        JSONArray arr = new JSONArray();
        arr.put(row);
        arr.put(col);
        return arr;
    }

    @Override
    public String toString() {
        return "Move(" + row + ", " + col + ")";
    }
}
