#pragma once
#include <json/json.h>
#include <vector>
#include <map>
#include <string>
#include <optional>
#include <stdexcept>

// ---------------------------------------------------------------------------
// Geometry. The RING uses one SHARED, ABSOLUTE coordinate system (indices
// 0..51): two tokens on the same RING index occupy the same square, which is
// exactly how a capture is detected. Each color enters the ring at START[color].
// ---------------------------------------------------------------------------
constexpr int RING_LENGTH = 52;
constexpr int HOME_COLUMN_LENGTH = 6;
constexpr int FINISH_INDEX = HOME_COLUMN_LENGTH - 1; // HOME_COLUMN index 5 == HOME

enum class Zone { BASE, RING, HOME_COLUMN };
enum class Color { RED, GREEN, YELLOW, BLUE };

inline Zone zoneFromString(const std::string& s) {
    if (s == "BASE") return Zone::BASE;
    if (s == "RING") return Zone::RING;
    if (s == "HOME_COLUMN") return Zone::HOME_COLUMN;
    throw std::runtime_error("bad zone: " + s);
}

inline Color colorFromString(const std::string& s) {
    if (s == "RED") return Color::RED;
    if (s == "GREEN") return Color::GREEN;
    if (s == "YELLOW") return Color::YELLOW;
    if (s == "BLUE") return Color::BLUE;
    throw std::runtime_error("bad color: " + s);
}

// Ring square each color enters / starts on. P1 = RED (0), P2 = YELLOW (26).
inline const std::map<Color, int> START = {
    {Color::RED, 0}, {Color::GREEN, 13}, {Color::YELLOW, 26}, {Color::BLUE, 39}
};

// ---------------------------------------------------------------------------
// Position — where a single token is (zone + index).
//   BASE         index -1      RING  index 0..51      HOME_COLUMN index 0..5
// ---------------------------------------------------------------------------
struct Position {
    Zone zone;
    int index;

    bool isBase() const { return zone == Zone::BASE; }
    bool isFinished() const { return zone == Zone::HOME_COLUMN && index == FINISH_INDEX; }

    static Position fromJson(const Json::Value& o) {
        return Position{ zoneFromString(o["zone"].asString()), o["index"].asInt() };
    }
};

// ---------------------------------------------------------------------------
// LudoMove — what makeMove() returns: a token index, or NO_MOVE.
//   return LudoMove(i);   // move your token at index i
//   return NO_MOVE;       // no legal move this turn
// ---------------------------------------------------------------------------
struct LudoMove {
    int token;     // token index to move
    bool noMove;

    LudoMove(int t = -1, bool nm = false) : token(t), noMove(nm) {}

    Json::Value toJson() const {
        return noMove ? Json::Value("NO_MOVE") : Json::Value(token);
    }
};

// Return this when state.legalMoves is empty.
inline const LudoMove NO_MOVE{-1, true};

// ---------------------------------------------------------------------------
// LudoState — passed to GameBot::makeMove().
// The wrapper uses the GameState / GameMove aliases so it stays generic.
// ---------------------------------------------------------------------------
struct LudoState {
    std::vector<std::vector<Position>> tokens; // [playerIndex][tokenIndex]
    int dice;                                  // your roll, 1-6
    int turn;                                  // 1-indexed move count
    int player;                                // your player ID (1 or 2)
    Color color;                               // your color
    std::map<int, Color> colors;               // player ID -> color
    std::optional<int> lastMove;               // opponent's last token index
    std::vector<int> legalMoves;               // token indices you may move

    static LudoState fromJson(int playerId, const Json::Value& msg) {
        LudoState s;
        s.player = playerId;
        s.turn = msg["turn"].asInt();

        const Json::Value& board = msg["board"];
        s.dice = board["dice"].asInt();

        for (const auto& row : board["tokens"]) {
            std::vector<Position> toks;
            for (const auto& tk : row) toks.push_back(Position::fromJson(tk));
            s.tokens.push_back(std::move(toks));
        }

        const Json::Value& cols = board["colors"];
        for (const auto& key : cols.getMemberNames())
            s.colors[std::stoi(key)] = colorFromString(cols[key].asString());
        s.color = s.colors[playerId];

        const Json::Value& lm = msg["last_move"];
        if (!lm.isNull() && lm["move"].isInt())
            s.lastMove = lm["move"].asInt();   // "NO_MOVE" string -> nullopt

        for (const auto& m : msg["legal_moves"]) s.legalMoves.push_back(m.asInt());

        return s;
    }
};

// Type aliases used by wrapper.cpp to stay game-agnostic.
using GameState = LudoState;
using GameMove  = LudoMove;
