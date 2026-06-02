FROM python:3.11-slim

WORKDIR /app

# Copy only the bootstrapper and game adapters — nothing else.
COPY bootstrappers/python/wrapper.py /app/wrapper.py
COPY games/ /app/games/

# Mount point for the user's bot file (bind-mounted read-only by the referee).
RUN mkdir /bot

# No pip install — bots may only use the Python standard library.

USER nobody

# /bot/user_bot is mounted read-only at runtime by the referee.
ENTRYPOINT ["python3", "/app/wrapper.py", "/bot/user_bot"]
