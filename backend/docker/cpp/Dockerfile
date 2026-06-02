# ── Stage 1: compile wrapper + user bot into a single binary ──────────────
FROM gcc:13 AS builder

RUN apt-get update && apt-get install -y libjsoncpp-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy bootstrapper and the game-specific adapter header.
COPY bootstrappers/cpp/wrapper.cpp  .
COPY bootstrappers/cpp/gamebot.h    .

# The game adapter header directory is passed as a build argument.
# Default: tictactoe. Override with --build-arg GAME=connect4 for other games.
ARG GAME=tictactoe
COPY games/${GAME}/adapters/cpp/    ./game_adapter/

# The user's .cpp file must be passed in via build context.
# Build with: docker build --build-arg GAME=tictactoe \
#               -f docker/cpp/Dockerfile \
#               --build-arg USER_BOT=path/to/bot.cpp \
#               -t gamebot-cpp-<matchid> .
ARG USER_BOT
COPY ${USER_BOT} ./user_bot.cpp

# Determine the game-specific header name (e.g. "tictactoe.h").
RUN GAME_HEADER="${GAME}.h" && \
    g++ -O2 -std=c++17 \
        -I./game_adapter \
        -DGAME_HEADER="\"${GAME_HEADER}\"" \
        wrapper.cpp user_bot.cpp \
        -ljsoncpp \
        -o /bot_binary

# ── Stage 2: minimal runtime — no compiler ────────────────────────────────
FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y libjsoncpp25 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /bot_binary /bot_binary

USER nobody

# No volume mount needed — the binary already contains the user's code.
ENTRYPOINT ["/bot_binary"]
