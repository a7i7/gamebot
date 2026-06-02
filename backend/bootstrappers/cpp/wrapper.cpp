/**
 * Generic C++ bootstrapper.
 *
 * Compiled together with the user's bot file:
 *   g++ -O2 -std=c++17 \
 *       -I/app/games/<game>/adapters/cpp \
 *       -DGAME_HEADER="tictactoe.h" \
 *       wrapper.cpp user_bot.cpp -ljsoncpp -o bot_binary
 *
 * The game adapter header (selected via GAME_HEADER) must define:
 *   struct GameState { static GameState fromJson(int playerId, const Json::Value&); };
 *   struct GameMove  { Json::Value toJson() const; };
 *
 * The user's .cpp must define:
 *   class GameBot {
 *   public:
 *       GameBot(int playerId);
 *       GameMove makeMove(const GameState& state);
 *   };
 */

#ifndef GAME_HEADER
#  error "Define GAME_HEADER at compile time, e.g. -DGAME_HEADER=\"tictactoe.h\""
#endif

#include GAME_HEADER  // defines GameState, GameMove

#include <iostream>
#include <sstream>
#include <string>
#include <memory>
#include <json/json.h>

// Forward-declare GameBot — defined in user_bot.cpp.
class GameBot;

int main() {
    std::unique_ptr<GameBot> bot;
    int playerId = 0;
    std::string line;

    Json::CharReaderBuilder readerBuilder;
    Json::StreamWriterBuilder writerBuilder;
    writerBuilder["indentation"] = "";

    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;

        Json::Value msg;
        std::string errs;
        std::istringstream ss(line);
        if (!Json::parseFromStream(readerBuilder, ss, &msg, &errs)) {
            std::cerr << "[wrapper] bad JSON: " << errs << "\n";
            continue;
        }

        std::string type = msg["type"].asString();

        if (type == "INIT") {
            playerId = msg["player"].asInt();
            bot = std::make_unique<GameBot>(playerId);

        } else if (type == "MOVE") {
            if (!bot) {
                std::cerr << "[wrapper] received MOVE before INIT\n";
                return 1;
            }
            try {
                GameState state = GameState::fromJson(playerId, msg);
                GameMove  move  = bot->makeMove(state);
                Json::Value response(Json::objectValue);
                response["move"] = move.toJson();
                std::cout << Json::writeString(writerBuilder, response) << "\n";
                std::cout.flush();
            } catch (const std::exception& e) {
                std::cerr << "[wrapper] makeMove threw: " << e.what() << "\n";
                return 1;
            }

        } else if (type == "END") {
            return 0;
        }
        // Unknown types ignored.
    }
    return 0;
}
