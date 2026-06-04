import org.json.JSONObject;

/**
 * Where a single token is, as a (zone, index) pair.
 *
 * The RING uses one SHARED, ABSOLUTE coordinate system (indices 0..51). Two
 * tokens with zone RING and the same index occupy the same physical square —
 * that is exactly how you detect a capture, with no per-color math needed.
 *
 *   zone == Zone.BASE         index -1      in the yard
 *   zone == Zone.RING         index 0..51   shared/absolute ring square
 *   zone == Zone.HOME_COLUMN  index 0..5    your private column; 5 == HOME (done)
 */
public class Position {
    public final Zone zone;
    public final int index;

    public Position(Zone zone, int index) {
        this.zone = zone;
        this.index = index;
    }

    public boolean isBase() {
        return zone == Zone.BASE;
    }

    public boolean isFinished() {
        return zone == Zone.HOME_COLUMN && index == LudoState.FINISH_INDEX;
    }

    public static Position fromJson(JSONObject o) {
        return new Position(Zone.valueOf(o.getString("zone")), o.getInt("index"));
    }

    @Override
    public String toString() {
        return zone + ":" + index;
    }
}
