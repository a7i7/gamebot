/**
 * TicTacToe random bot — C++ example.
 *
 * state.board      — vector<vector<int>>  (0=empty, 1=p1, 2=p2)
 * state.legalMoves — vector<Move>
 * state.lastMove   — optional<Move>
 * state.player     — this bot's player ID (1 or 2)
 *
 * Compiled by the Dockerfile as:
 *   g++ -O2 -std=c++17 -I./game_adapter -DGAME_HEADER="tictactoe.h"
 *       wrapper.cpp random_bot.cpp -ljsoncpp -o bot_binary
 */
#include "tictactoe.h"
#include "gamebot.h"

#include <cstdlib>
#include <ctime>

class GameBot {
public:
    explicit GameBot(int playerId) : playerId_(playerId) {
        std::srand(static_cast<unsigned>(std::time(nullptr)));
    }

    Move makeMove(const TicTacToeState& state) {
        const auto& legal = state.legalMoves;
        return legal[std::rand() % legal.size()];
    }

private:
    int playerId_;
};
