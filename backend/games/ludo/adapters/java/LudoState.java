import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Collections;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;

/**
 * The current game state passed to GameBot.makeMove() each turn.
 *
 * The referee rolls the die for you and tells you whose turn it is — your only
 * decision is *which* of your tokens to move with that roll. Return one of the
 * indices in legalMoves as a LudoMove, or LudoMove.NO_MOVE if legalMoves is empty.
 *
 * Geometry: your tokens enter the ring at START.get(color) and travel clockwise.
 * RING is shared, so a capture is simply your moved token ending on a RING index
 * that an opponent token also occupies.
 */
public class LudoState {
    public static final int RING_LENGTH = 52;
    public static final int HOME_COLUMN_LENGTH = 6;
    /** HOME_COLUMN index that means HOME / finished. */
    public static final int FINISH_INDEX = HOME_COLUMN_LENGTH - 1; // 5

    /** Ring square each color enters / starts on (standard 4-color layout). */
    public static final Map<Color, Integer> START;
    static {
        Map<Color, Integer> m = new EnumMap<>(Color.class);
        m.put(Color.RED, 0);
        m.put(Color.GREEN, 13);
        m.put(Color.YELLOW, 26);
        m.put(Color.BLUE, 39);
        START = Collections.unmodifiableMap(m);
    }

    /** Every token's Position, indexed [playerIndex][tokenIndex]; yours are tokens[player - 1]. */
    public final Position[][] tokens;
    /** Your die roll this turn, 1-6. */
    public final int dice;
    /** 1-indexed total move count. */
    public final int turn;
    /** Your player ID, 1 or 2. */
    public final int player;
    /** Your color (Player 1 = RED, Player 2 = YELLOW). */
    public final Color color;
    /** Map of player ID -> Color for both players. */
    public final Map<Integer, Color> colors;
    /** Opponent's previous token index, or null on the first turn / after a pass. */
    public final Integer lastMove;
    /** Token indices you may legally move this turn (empty => return NO_MOVE). */
    public final int[] legalMoves;

    public LudoState(Position[][] tokens, int dice, int turn, int player, Color color,
                     Map<Integer, Color> colors, Integer lastMove, int[] legalMoves) {
        this.tokens = tokens;
        this.dice = dice;
        this.turn = turn;
        this.player = player;
        this.color = color;
        this.colors = colors;
        this.lastMove = lastMove;
        this.legalMoves = legalMoves;
    }

    /** Build a LudoState from the referee's MOVE JSON message. */
    public static LudoState fromJson(int playerId, JSONObject msg) {
        JSONObject board = msg.getJSONObject("board");

        JSONArray rawTokens = board.getJSONArray("tokens");
        Position[][] tokens = new Position[rawTokens.length()][];
        for (int p = 0; p < rawTokens.length(); p++) {
            JSONArray row = rawTokens.getJSONArray(p);
            Position[] toks = new Position[row.length()];
            for (int t = 0; t < row.length(); t++) {
                toks[t] = Position.fromJson(row.getJSONObject(t));
            }
            tokens[p] = toks;
        }

        JSONObject rawColors = board.getJSONObject("colors");
        Map<Integer, Color> colors = new HashMap<>();
        for (String key : rawColors.keySet()) {
            colors.put(Integer.parseInt(key), Color.valueOf(rawColors.getString(key)));
        }

        Integer lastMove = null;
        if (!msg.isNull("last_move")) {
            JSONObject lm = msg.getJSONObject("last_move");
            Object mv = lm.get("move");
            if (mv instanceof Number) {
                lastMove = ((Number) mv).intValue();   // "NO_MOVE" string -> null
            }
        }

        JSONArray rawLegal = msg.getJSONArray("legal_moves");
        int[] legal = new int[rawLegal.length()];
        for (int i = 0; i < rawLegal.length(); i++) {
            legal[i] = rawLegal.getInt(i);
        }

        return new LudoState(
            tokens, board.getInt("dice"), msg.getInt("turn"), playerId,
            colors.get(playerId), colors, lastMove, legal
        );
    }
}
