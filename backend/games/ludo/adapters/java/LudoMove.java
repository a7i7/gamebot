/**
 * The move a Ludo bot returns from makeMove(): which token to advance with the
 * die the referee already rolled.
 *
 *   return new LudoMove(i);     // move your token at index i
 *   return LudoMove.NO_MOVE;    // you have no legal move this turn
 *
 * (Named LudoMove rather than Move because all game adapters share one flat
 * Java classpath in the container, and TicTacToe already defines a Move class.)
 */
public class LudoMove {
    /** Index of the token to move (ignored when noMove is true). */
    public final int tokenIndex;
    /** True when this is the "no legal move" answer. */
    public final boolean noMove;

    private LudoMove(int tokenIndex, boolean noMove) {
        this.tokenIndex = tokenIndex;
        this.noMove = noMove;
    }

    public LudoMove(int tokenIndex) {
        this(tokenIndex, false);
    }

    /** Return this when state.legalMoves is empty. */
    public static final LudoMove NO_MOVE = new LudoMove(-1, true);

    /** Serialise to the wire form: a token index, or the string "NO_MOVE". */
    public Object toJson() {
        return noMove ? "NO_MOVE" : Integer.valueOf(tokenIndex);
    }

    @Override
    public String toString() {
        return noMove ? "NO_MOVE" : "LudoMove(" + tokenIndex + ")";
    }
}
