# ── Stage 1: compile the wrapper and all adapter classes ──────────────────
FROM eclipse-temurin:21-jdk AS builder

WORKDIR /build

# Download org.json (only external dependency — bundled, not fetched at runtime).
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/* \
    && curl -L https://repo1.maven.org/maven2/org/json/json/20231013/json-20231013.jar \
       -o json.jar

# Copy sources: bootstrapper, interface, and all Java game adapters.
COPY bootstrappers/java/GameBotInterface.java .
COPY bootstrappers/java/Wrapper.java .
COPY games/tictactoe/adapters/java/ .

# Compile everything together.
RUN javac -cp json.jar *.java

# ── Stage 2: JRE-only runtime ──────────────────────────────────────────────
FROM eclipse-temurin:21-jdk AS runtime
# Note: we keep the full JDK (not just JRE) because we need javac to compile
# the user's .java file at container start time (see entrypoint.sh).

WORKDIR /app
COPY --from=builder /build/json.jar /app/lib/json.jar
COPY --from=builder /build/*.class  /app/classes/
COPY docker/java/entrypoint.sh      /entrypoint.sh
RUN chmod +x /entrypoint.sh

# /tmp is mounted as a writable tmpfs by the referee (size=50m).
# Java class loading requires exec permission there.

USER nobody

# /bot/user_bot is the user's .java file, mounted read-only.
ENTRYPOINT ["/entrypoint.sh"]
