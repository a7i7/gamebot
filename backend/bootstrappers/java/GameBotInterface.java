/**
 * Interface that all Java GameBot implementations must satisfy.
 *
 * The generic type T is the game-specific state type (e.g. TicTacToeState).
 * The return type M is the game-specific move type (e.g. Move).
 *
 * In practice the wrapper uses reflection rather than a typed interface, so
 * Java bots do not need to explicitly implement this — but doing so gives
 * IDE support and compile-time checks.
 */
public interface GameBotInterface<T, M> {
    M makeMove(T gameState);
}
