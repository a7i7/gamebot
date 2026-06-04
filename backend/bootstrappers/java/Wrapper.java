import org.json.JSONObject;
import org.json.JSONArray;

import java.io.*;
import java.lang.reflect.*;
import java.net.*;
import java.nio.file.*;

/**
 * Generic Java bootstrapper.
 *
 * Invoked as: java -cp /app/lib/*:/app/games/<game>/adapters/java:/tmp Wrapper <ClassName>
 *
 * The user's class (e.g. RandomBot) must have:
 *   public RandomBot(int playerId) { ... }
 *   public Move makeMove(<GameState> state) { ... }
 *
 * The wrapper reads the game name from INIT, ensures the correct adapter
 * classes are on the classpath (they are compiled into the container), then
 * drives the stdin/stdout loop.
 */
public class Wrapper {

    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            System.err.println("usage: java Wrapper <ClassName>");
            System.exit(1);
        }

        String className = args[0];

        BufferedReader stdin  = new BufferedReader(new InputStreamReader(System.in));
        PrintWriter    stdout = new PrintWriter(new BufferedWriter(new OutputStreamWriter(System.err)));

        Class<?> botClass = Class.forName(className);
        Object   bot       = null;
        String   gameName  = null;

        String line;
        while ((line = stdin.readLine()) != null) {
            line = line.trim();
            if (line.isEmpty()) continue;

            JSONObject msg;
            try {
                msg = new JSONObject(line);
            } catch (Exception e) {
                System.err.println("[wrapper] bad JSON: " + e.getMessage());
                continue;
            }

            String type = msg.getString("type");

            switch (type) {
                case "INIT": {
                    gameName = msg.getString("game");
                    int player = msg.getInt("player");
                    PlayerIdHolder.set(player);
                    Constructor<?> ctor = botClass.getConstructor(int.class);
                    bot = ctor.newInstance(player);
                    break;
                }

                case "MOVE": {
                    if (bot == null) {
                        System.err.println("[wrapper] received MOVE before INIT");
                        System.exit(1);
                    }
                    try {
                        // Resolve the game-specific state class (e.g. TicTacToeState)
                        // and deserialise via its static fromJson(int, JSONObject) factory.
                        Object state = deserialiseState(gameName, msg);

                        // Call makeMove via reflection — accepts the state type.
                        Method makeMove = findMakeMove(botClass, state.getClass());
                        Object moveObj  = makeMove.invoke(bot, state);

                        // Serialise via the move's toJson() if available, else fall
                        // back to row/col fields. The result may be a JSONArray
                        // (e.g. TicTacToe [row, col]) or a scalar (e.g. Ludo's token
                        // index / "NO_MOVE" string) — JSONObject.put accepts any.
                        Object moveJson = serialiseMove(moveObj);
                        JSONObject response = new JSONObject();
                        response.put("move", moveJson);
                        stdout.println(response.toString());
                        stdout.flush();
                    } catch (InvocationTargetException e) {
                        // Print to System.out (the debug/bot_log channel) so the
                        // exception is visible to the user, not swallowed by the
                        // protocol reader which listens on System.err.
                        System.out.println("[wrapper] makeMove threw: " + e.getCause());
                        e.getCause().printStackTrace(System.out);
                        System.out.flush();
                        System.exit(1);
                    }
                    break;
                }

                case "END":
                    System.exit(0);
                    break;

                default:
                    // Ignore unknown message types.
                    break;
            }
        }
    }

    // -----------------------------------------------------------------------

    private static Object deserialiseState(String gameName, JSONObject msg) throws Exception {
        // State class name convention: <GameNamePascal>State  e.g. TicTacToeState
        String stateClassName = toPascalCase(gameName) + "State";
        Class<?> stateClass = Class.forName(stateClassName);
        Method factory = stateClass.getMethod("fromJson", int.class, JSONObject.class);
        // player id was stored by INIT; we pass it via the msg's context.
        // We thread player_id through a thread-local set during INIT.
        return factory.invoke(null, PlayerIdHolder.get(), msg);
    }

    private static Method findMakeMove(Class<?> botClass, Class<?> stateClass) throws Exception {
        for (Method m : botClass.getMethods()) {
            if (m.getName().equals("makeMove") && m.getParameterCount() == 1
                    && m.getParameterTypes()[0].isAssignableFrom(stateClass)) {
                return m;
            }
        }
        throw new NoSuchMethodException("makeMove(" + stateClass.getSimpleName() + ") not found in " + botClass);
    }

    private static Object serialiseMove(Object move) throws Exception {
        try {
            Method toJson = move.getClass().getMethod("toJson");
            // Whatever toJson() returns — a JSONArray, an Integer, a String — is
            // put straight onto the response, so games can use scalar moves.
            return toJson.invoke(move);
        } catch (NoSuchMethodException e) {
            // Fallback: assume Move has row/col fields.
            JSONArray arr = new JSONArray();
            arr.put(move.getClass().getField("row").getInt(move));
            arr.put(move.getClass().getField("col").getInt(move));
            return arr;
        }
    }

    private static String toPascalCase(String gameName) {
        // "tictactoe" -> "Tictactoe"  (adapter class is "TicTacToeState")
        // The convention is: class name = game name with first letter uppercased,
        // but adapters use explicit names so we store a mapping here.
        switch (gameName) {
            case "tictactoe": return "TicTacToe";
            default:
                return Character.toUpperCase(gameName.charAt(0)) + gameName.substring(1);
        }
    }

    // Thread-local to carry player_id from INIT through to deserialiseState.
    static class PlayerIdHolder {
        private static final ThreadLocal<Integer> value = new ThreadLocal<>();
        static void set(int id) { value.set(id); }
        static int get() { return value.get(); }
    }
}
