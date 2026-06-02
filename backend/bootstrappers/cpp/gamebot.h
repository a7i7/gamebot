#pragma once
/**
 * Generic C++ GameBot contract.
 *
 * Every C++ bot must include this header and implement the GameBot class.
 * The concrete game state/move types (e.g. TicTacToeState, Move) are
 * pulled in via the game-specific header included by wrapper.cpp before
 * this header is processed.
 *
 * Example (tictactoe):
 *   // user_bot.cpp
 *   #include "tictactoe.h"
 *   #include "gamebot.h"
 *
 *   class GameBot {
 *   public:
 *       GameBot(int playerId) : playerId_(playerId) {}
 *       Move makeMove(const TicTacToeState& state) { ... }
 *   private:
 *       int playerId_;
 *   };
 *
 * The wrapper instantiates GameBot(playerId) once on INIT, then calls
 * makeMove(state) on every MOVE message.
 */

// No code here — the contract is enforced structurally by wrapper.cpp
// which forward-declares and calls GameBot(int) and GameBot::makeMove.
