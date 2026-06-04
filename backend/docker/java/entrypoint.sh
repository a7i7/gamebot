#!/bin/sh
# The user's .java file is at /bot/user_bot (read-only mount).
# Copy it to /tmp (writable tmpfs), compile, and run.
set -e

# Extract the public class name from the source so the filename matches.
CLASS_NAME=$(grep -m1 'public class' /bot/user_bot | sed 's/.*public class \([A-Za-z_][A-Za-z0-9_]*\).*/\1/')

if [ -z "$CLASS_NAME" ]; then
    echo "[entrypoint] Could not find 'public class' declaration in bot file" >&2
    exit 1
fi

cp /bot/user_bot /tmp/${CLASS_NAME}.java

# Compile against the bundled wrapper classes and org.json.
# Redirect errors to stdout so they appear in bot_logs (stderr is the protocol
# channel for Java bots, so compile errors there would be silently swallowed).
if ! javac -cp /app/lib/json.jar:/app/classes /tmp/${CLASS_NAME}.java > /tmp/compile.out 2>&1; then
    cat /tmp/compile.out   # stdout = debug channel = visible in bot_logs
    exit 1
fi

# Run the wrapper with compiled classes on the classpath.
exec java -cp /tmp:/app/classes:/app/lib/json.jar Wrapper "$CLASS_NAME"
