/**
 * Which part of the board a token sits on.
 *
 *   BASE         in the yard; Position.index == -1
 *   RING         on the shared ring; index 0..51 (absolute/shared)
 *   HOME_COLUMN  in your private column; index 0..5 (index 5 == HOME)
 */
public enum Zone {
    BASE,
    RING,
    HOME_COLUMN
}
