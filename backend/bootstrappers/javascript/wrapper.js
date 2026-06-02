#!/usr/bin/env node
/**
 * Generic JavaScript bootstrapper.
 *
 * Invoked as: node wrapper.js <bot_file.js>
 *
 * The user's file must export a class named GameBot:
 *   class GameBot {
 *     constructor(playerId) { ... }
 *     makeMove(state) { ... }   // sync or async
 *   }
 *   module.exports = { GameBot };
 *
 * The wrapper reads the game name from INIT, loads the matching adapter,
 * and drives the stdin/stdout loop. Adapter types (Move, TicTacToeState,
 * etc.) are available to the user via require('./tictactoe') inside the
 * bot file or simply from the injected globals (see adapter injection below).
 */
"use strict";

const path = require("path");
const readline = require("readline");

const botFilePath = process.argv[2];
if (!botFilePath) {
  process.stderr.write("usage: node wrapper.js <bot_file.js>\n");
  process.exit(1);
}

const { GameBot } = require(path.resolve(botFilePath));

let bot = null;
let adapter = null;
let playerId = null;

function loadAdapter(gameName) {
  // e.g. "tictactoe" -> /app/games/tictactoe/adapters/javascript.js
  const adapterPath = path.join(__dirname, "..", "..", "games", gameName, "adapters", "javascript.js");
  return require(adapterPath);
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });

// Sequential message queue — guarantees in-order processing even for async makeMove.
let queue = Promise.resolve();

rl.on("line", (line) => {
  line = line.trim();
  if (!line) return;

  let msg;
  try {
    msg = JSON.parse(line);
  } catch (e) {
    process.stderr.write(`[wrapper] bad JSON: ${e.message}\n`);
    return;
  }

  queue = queue.then(async () => {
    const { type } = msg;

    if (type === "INIT") {
      adapter = loadAdapter(msg.game);
      playerId = msg.player;
      bot = new GameBot(playerId);

    } else if (type === "MOVE") {
      if (!bot) {
        process.stderr.write("[wrapper] received MOVE before INIT\n");
        process.exit(1);
      }
      try {
        const state = adapter.fromJson(playerId, msg);
        const move = await Promise.resolve(bot.makeMove(state));
        process.stdout.write(JSON.stringify({ move: adapter.toJson(move) }) + "\n");
      } catch (e) {
        process.stderr.write(e.stack + "\n");
        process.exit(1);
      }

    } else if (type === "END") {
      process.exit(0);
    }
    // Unknown types ignored.
  });
});

rl.on("close", () => {
  queue.then(() => process.exit(0));
});
