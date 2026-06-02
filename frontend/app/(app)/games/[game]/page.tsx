"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelSeparator,
} from "react-resizable-panels";
import { submitMatch } from "@/lib/api";
import type { Lang } from "@/lib/api";
import { GameInfoPanel } from "@/components/GameInfoPanel";
import { ResultsPanel } from "@/components/ResultsPanel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

const STARTER_CODE: Record<Lang, string> = {
  python: `class GameBot:
    """
    Your bot implementation for TicTacToe.

    The game framework passes a TicTacToeState object to makeMove() containing:
      - state.board: 3x3 tuple of Cell values (0=EMPTY, 1=P1, 2=P2)
      - state.player: your player ID (1 or 2)
      - state.turn: how many moves have been played (1-indexed)
      - state.last_move: opponent's last Move, or None on your first turn
      - state.legal_moves: tuple of valid Move(row,col) objects you can make

    IMPORTANT: Any instance variables you store in __init__ will be available
    throughout the entire game. Each call to makeMove() can access and modify
    them to track game progress, history, or strategy.
    """

    def __init__(self, player_id: int):
        """Initialize your bot with your player ID."""
        self.player_id = player_id
        # You can store any state here - it persists across all makeMove() calls
        self.my_moves = []  # Track moves you've made
        self.opponent_moves = []  # Track opponent's moves

    def makeMove(self, state) -> list:
        """
        Decide your next move given the game state.

        Args:
            state: TicTacToeState object with board and legal moves

        Returns:
            A Move(row, col) from state.legal_moves indicating where to place your mark.
            Must return a valid move or the game will disqualify you.

        Example:
            # Access previously stored state
            if len(self.opponent_moves) > 0:
                last_opp_move = self.opponent_moves[-1]

            # Check if you own the center
            if state.board[1][1] == state.player:
                # You already have the center

            # Make a random move and store it
            import random
            move = random.choice(state.legal_moves)
            self.my_moves.append(move)
            return move
        """
        import random
        # Track opponent's last move if it exists
        if state.last_move:
            self.opponent_moves.append(state.last_move)

        # This simple bot picks a random legal move
        move = random.choice(state.legal_moves)
        self.my_moves.append(move)
        return move
`,
  javascript: `/**
 * Your bot implementation for TicTacToe.
 *
 * The game framework passes a TicTacToeState object to makeMove() containing:
 *   - state.board: 3x3 array of cell values (0=EMPTY, 1=P1, 2=P2)
 *   - state.player: your player ID (1 or 2)
 *   - state.turn: how many moves have been played (1-indexed)
 *   - state.lastMove: opponent's last Move { row, col }, or null on your first turn
 *   - state.legalMoves: array of valid Move objects you can make
 *
 * IMPORTANT: Any instance properties you store in the constructor will be
 * available throughout the entire game. Each call to makeMove() can access
 * and modify them to track game progress, history, or strategy.
 */
export class GameBot {
  /**
   * Initialize your bot with your player ID.
   * @param {number} playerId - Your player ID (1 or 2)
   */
  constructor(playerId) {
    this.playerId = playerId;
    // You can store any state here - it persists across all makeMove() calls
    this.myMoves = [];      // Track moves you've made
    this.opponentMoves = []; // Track opponent's moves
  }

  /**
   * Decide your next move given the game state.
   *
   * @param {TicTacToeState} state - Current game state with board and legal moves
   * @returns {Move} A Move { row, col } from state.legalMoves.
   *                 Must return a valid move or the game will disqualify you.
   *
   * Example:
   *   // Access previously stored state
   *   if (this.opponentMoves.length > 0) {
   *       const lastOppMove = this.opponentMoves[this.opponentMoves.length - 1];
   *   }
   *
   *   // Check if center is empty
   *   if (state.board[1][1] === 0) {
   *     return new Move(1, 1);  // Take the center
   *   }
   *
   *   // Make a random move and store it
   *   const moves = state.legalMoves;
   *   const move = moves[Math.floor(Math.random() * moves.length)];
   *   this.myMoves.push(move);
   *   return move;
   */
  makeMove(state) {
    // Track opponent's last move if it exists
    if (state.lastMove) {
      this.opponentMoves.push(state.lastMove);
    }

    // This simple bot picks a random legal move from available options
    const moves = state.legalMoves;
    const move = moves[Math.floor(Math.random() * moves.length)];
    this.myMoves.push(move);
    return move;
  }
}
`,
  java: `import java.util.ArrayList;
import java.util.List;

/**
 * Your bot implementation for TicTacToe.
 *
 * The game framework passes a TicTacToeState object to makeMove() containing:
 *   - state.board: int[3][3] array (0=EMPTY, 1=P1, 2=P2)
 *   - state.player: your player ID (1 or 2)
 *   - state.turn: how many moves have been played (1-indexed)
 *   - state.lastMove: opponent's last Move, or null on your first turn
 *   - state.legalMoves: List<Move> of valid moves you can make
 *
 * Cell values:
 *   0 = EMPTY (unoccupied)
 *   1 = P1 (player 1's mark)
 *   2 = P2 (player 2's mark)
 *
 * IMPORTANT: Any instance variables you declare will be available throughout
 * the entire game. Each call to makeMove() can access and modify them to
 * track game progress, history, or strategy.
 */
public class GameBot {
    private int playerId;
    // You can store any state here - it persists across all makeMove() calls
    private List<Move> myMoves = new ArrayList<>();      // Track moves you've made
    private List<Move> opponentMoves = new ArrayList<>(); // Track opponent's moves

    /**
     * Initialize your bot with your player ID.
     * @param playerId Your player ID (1 or 2)
     */
    public GameBot(int playerId) {
        this.playerId = playerId;
    }

    /**
     * Decide your next move given the game state.
     *
     * @param state TicTacToeState containing the board and legal moves
     * @return A Move from state.legalMoves indicating where to place your mark.
     *         Must return a valid move or the game will disqualify you.
     *
     * Example:
     *   // Access previously stored state
     *   if (!opponentMoves.isEmpty()) {
     *       Move lastOppMove = opponentMoves.get(opponentMoves.size() - 1);
     *   }
     *
     *   // Check if center is empty
     *   if (state.board[1][1] == 0) {
     *       return new Move(1, 1);  // Take the center
     *   }
     *
     *   // Check if you own the center
     *   if (state.board[1][1] == state.player) {
     *       // You already have the center
     *   }
     *
     *   // Make a move and store it
     *   Move move = state.legalMoves.get(0);
     *   myMoves.add(move);
     *   return move;
     */
    public Move makeMove(TicTacToeState state) {
        // Track opponent's last move if it exists
        if (state.lastMove != null) {
            opponentMoves.add(state.lastMove);
        }

        // This simple bot picks a random legal move
        Move move = state.legalMoves.get((int)(Math.random() * state.legalMoves.size()));
        myMoves.add(move);
        return move;
    }
}
`,
  cpp: `/**
 * Your bot implementation for TicTacToe.
 *
 * Parameters to makeMove():
 *   - board: reference to 3x3 grid (0=EMPTY, 1=P1, 2=P2)
 *   - legalMoves: reference to vector of valid [row, col] moves
 *   - playerId: your player ID (1 or 2)
 *   - turn: how many moves have been played (1-indexed)
 *   - lastMove: vector [row, col] of opponent's last move, empty if first turn
 *
 * Return: vector [row, col] indicating where to place your mark.
 *         Must be one of the legalMoves or the game will disqualify you.
 *
 * IMPORTANT: Any member variables you declare will be available throughout
 * the entire game. Each call to makeMove() can access and modify them to
 * track game progress, history, or strategy.
 */
#include <vector>
#include <cstdlib>
using namespace std;

class GameBot {
public:
    int playerId;
    // You can store any state here - it persists across all makeMove() calls
    vector<vector<int>> myMoves;      // Track moves you've made
    vector<vector<int>> opponentMoves; // Track opponent's moves

    GameBot(int id) : playerId(id) {}

    /**
     * Decide your next move given the game state.
     *
     * Example:
     *   // Access previously stored state
     *   if (!opponentMoves.empty()) {
     *       auto lastOppMove = opponentMoves.back();
     *   }
     *
     *   // Check if center is empty
     *   if (board[1][1] == 0) {
     *       return {1, 1};  // Take the center
     *   }
     *
     *   // Check if you own the center
     *   if (board[1][1] == playerId) {
     *       // You already have the center
     *   }
     *
     *   // Make a move and store it
     *   auto move = legalMoves[0];
     *   myMoves.push_back(move);
     *   return move;
     */
    vector<int> makeMove(vector<vector<int>>& board,
                         vector<vector<int>>& legalMoves) {
        // This simple bot picks a random legal move
        int idx = rand() % legalMoves.size();
        auto move = legalMoves[idx];
        myMoves.push_back(move);
        return move;
    }
};
`,
};

const LANG_LABELS: Record<Lang, string> = {
  python: "Python",
  javascript: "JavaScript",
  java: "Java",
  cpp: "C++",
};

const MONACO_LANG: Record<Lang, string> = {
  python: "python",
  javascript: "javascript",
  java: "java",
  cpp: "cpp",
};

export default function GameEditorPage() {
  const params = useParams();
  const game = params.game as string;

  const [lang, setLang] = useState<Lang>("python");
  const [code, setCode] = useState(STARTER_CODE.python);
  const [opponent, setOpponent] = useState("easy");
  const [submitting, setSubmitting] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function handleLangChange(newLang: Lang) {
    setLang(newLang);
    setCode(STARTER_CODE[newLang]);
  }

  async function handleRun(isSubmit: boolean) {
    setError("");
    setSubmitting(true);
    setMatchId(null);
    try {
      const { match_id } = await submitMatch(game, lang, code, opponent);
      setMatchId(match_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background shrink-0">
        <Select value={lang} onValueChange={(v) => handleLangChange(v as Lang)}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
              <SelectItem key={l} value={l}>
                {LANG_LABELS[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={opponent} onValueChange={setOpponent}>
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue>
              {opponent.charAt(0).toUpperCase() +
                opponent.substring(1).toLocaleLowerCase()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {error && <span className="text-xs text-destructive">{error}</span>}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRun(false)}
            disabled={submitting}
          >
            {submitting ? "Running…" : "Test Run"}
          </Button>
          <Button
            size="sm"
            onClick={() => handleRun(true)}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit →"}
          </Button>
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 overflow-hidden">
        {/* Desktop: 3 horizontal panels */}
        <div className="hidden md:block h-full">
          <PanelGroup orientation="horizontal">
            <Panel defaultSize={25} minSize={15}>
              <GameInfoPanel game={game} />
            </Panel>
            <PanelSeparator className="w-1 bg-border hover:bg-primary/40 transition-colors cursor-col-resize" />
            <Panel defaultSize={45} minSize={25}>
              <MonacoEditor
                height="100%"
                language={MONACO_LANG[lang]}
                value={code}
                onChange={(v) => setCode(v ?? "")}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 12 },
                  fontFamily: "IBM Plex Mono, monospace",
                }}
              />
            </Panel>
            <PanelSeparator className="w-1 bg-border hover:bg-primary/40 transition-colors cursor-col-resize" />
            <Panel defaultSize={30} minSize={20}>
              <ResultsPanel matchId={matchId} />
            </Panel>
          </PanelGroup>
        </div>

        {/* Mobile: stacked */}
        <div className="md:hidden flex flex-col h-full overflow-auto">
          <div className="border-b border-border">
            <GameInfoPanel game={game} />
          </div>
          <div className="h-72 shrink-0">
            <MonacoEditor
              height="100%"
              language={MONACO_LANG[lang]}
              value={code}
              onChange={(v) => setCode(v ?? "")}
              theme="vs-dark"
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 12 },
                fontFamily: "IBM Plex Mono, monospace",
              }}
            />
          </div>
          <div className="border-t border-border flex-1">
            <ResultsPanel matchId={matchId} />
          </div>
        </div>
      </div>
    </div>
  );
}
