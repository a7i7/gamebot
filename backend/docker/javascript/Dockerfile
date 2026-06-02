FROM node:20-slim

WORKDIR /app

COPY bootstrappers/javascript/wrapper.js /app/wrapper.js
COPY games/ /app/games/

RUN mkdir /bot

USER nobody

# /bot/user_bot is the user's .js file, mounted read-only by the referee.
ENTRYPOINT ["node", "/app/wrapper.js", "/bot/user_bot"]
