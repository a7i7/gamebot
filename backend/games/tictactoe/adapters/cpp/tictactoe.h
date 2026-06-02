#pragma once
#include <json/json.h>
#include <vector>
#include <optional>
#include <stdexcept>

// ---------------------------------------------------------------------------
// Move — a (row, col) pair returned by GameBot::makeMove()
// ---------------------------------------------------------------------------
struct Move {
    int row;
    int col;

    Move(int r, int c) : row(r), col(c) {}

    static Move fromJson(const Json::Value& arr) {
        return Move(arr[0].asInt(), arr[1].asInt());
    }

    Json::Value toJson() const {
        Json::Value arr(Json::arrayValue);
        arr.append(row);
        arr.append(col);
        return arr;
    }
};

// ---------------------------------------------------------------------------
// TicTacToeState — passed to GameBot::makeMove()
// The wrapper uses the GameState / GameMove aliases so it stays generic.
// ---------------------------------------------------------------------------
struct TicTacToeState {
    std::vector<std::vector<int>> board;  // 3x3; 0=empty, 1=p1, 2=p2
    int turn;                             // 1-indexed full-game move count
    int player;                           // this bot's player ID (1 or 2)
    std::optional<Move> lastMove;         // opponent's last move
    std::vector<Move> legalMoves;         // pre-computed legal moves

    static TicTacToeState fromJson(int playerId, const Json::Value& msg) {
        TicTacToeState s;
        s.player = playerId;
        s.turn   = msg["turn"].asInt();

        const Json::Value& rawBoard = msg["board"];
        int size = rawBoard.size();
        s.board.resize(size, std::vector<int>(size));
        for (int r = 0; r < size; r++)
            for (int c = 0; c < size; c++)
                s.board[r][c] = rawBoard[r][c].asInt();

        const Json::Value& lm = msg["last_move"];
        if (!lm.isNull())
            s.lastMove = Move::fromJson(lm["move"]);

        const Json::Value& legal = msg["legal_moves"];
        for (const auto& m : legal)
            s.legalMoves.push_back(Move::fromJson(m));

        return s;
    }
};

// Type aliases used by wrapper.cpp to stay game-agnostic.
using GameState = TicTacToeState;
using GameMove  = Move;
