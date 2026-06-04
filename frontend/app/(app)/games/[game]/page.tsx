"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelSeparator,
} from "react-resizable-panels";
import { submitTestRun, createSubmission } from "@/lib/api";
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
  python: `# ── Types injected by the framework (no import needed) ───────────────────
#
# Cell (IntEnum)
#   Cell.EMPTY = 0    unoccupied
#   Cell.P1    = 1    player 1 (X)
#   Cell.P2    = 2    player 2 (O)
#
# Move(row, col)
#   move.row          int  row index, 0 = top,  2 = bottom
#   move.col          int  col index, 0 = left, 2 = right
#   r, c = move       Move is iterable
#
# TicTacToeState  (passed to makeMove every turn)
#   state.board         tuple[tuple[Cell]]  3x3 grid
#                       state.board[row][col] returns a Cell value
#   state.player        int   your player ID — 1 (X) or 2 (O)
#   state.turn          int   1-indexed move count (1 = you move first)
#   state.last_move     Move | None   opponent's last move; None on turn 1
#   state.legal_moves   tuple[Move]   every valid move; you must return one
#
# Board cell checks:
#   state.board[r][c] == Cell.EMPTY          → free
#   state.board[r][c] == state.player        → your mark
#   state.board[r][c] != Cell.EMPTY and
#   state.board[r][c] != state.player        → opponent's mark
# ─────────────────────────────────────────────────────────────────────────

import random

class GameBot:
    def __init__(self, player_id: int):
        self.player_id = player_id  # 1 or 2, constant for the whole game

    def makeMove(self, state) -> "Move":
        # Take center if free
        if state.board[1][1] == Cell.EMPTY:
            return Move(1, 1)

        # React to opponent's last move
        if state.last_move:
            opp_row, opp_col = state.last_move  # unpack row and col

        # Scan the board manually
        for r in range(3):
            for c in range(3):
                if state.board[r][c] == Cell.EMPTY:
                    pass  # free cell at (r, c)

        # Pick a random legal move
        return random.choice(state.legal_moves)
`,
  javascript: `// ── Types injected by the framework (available as globals) ───────────────
//
// Cell (object)
//   Cell.EMPTY = 0    unoccupied
//   Cell.P1    = 1    player 1 (X)
//   Cell.P2    = 2    player 2 (O)
//
// Move
//   move.row          number  row index, 0 = top,  2 = bottom
//   move.col          number  col index, 0 = left, 2 = right
//   move.toArray()    returns [row, col]
//   new Move(row, col) constructs a move (must still be in legalMoves)
//
// TicTacToeState  (passed to makeMove every turn)
//   state.board         number[][]  3x3 grid
//                       state.board[row][col] returns 0, 1, or 2
//   state.player        number  your player ID — 1 (X) or 2 (O)
//   state.turn          number  1-indexed move count (1 = you move first)
//   state.lastMove      Move | null   opponent's last move; null on turn 1
//   state.legalMoves    Move[]        every valid move; you must return one
//
// Board cell checks:
//   state.board[r][c] === Cell.EMPTY             → free
//   state.board[r][c] === state.player           → your mark
//   state.board[r][c] !== Cell.EMPTY &&
//   state.board[r][c] !== state.player           → opponent's mark
// ─────────────────────────────────────────────────────────────────────────

export class GameBot {
  constructor(playerId) {
    this.playerId = playerId; // 1 or 2, constant for the whole game
  }

  makeMove(state) {
    // Take center if free
    if (state.board[1][1] === Cell.EMPTY) {
      return new Move(1, 1);
    }

    // React to opponent's last move
    if (state.lastMove) {
      const { row, col } = state.lastMove;
    }

    // Scan the board manually
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (state.board[r][c] === Cell.EMPTY) {
          // free cell at (r, c)
        }
      }
    }

    // Pick a random legal move
    const moves = state.legalMoves;
    return moves[Math.floor(Math.random() * moves.length)];
  }
}
`,
  java: `// ── Available types ───────────────────────────────────────────────────────
//
// Cell  (utility constants)
//   Cell.EMPTY = 0    unoccupied
//   Cell.P1    = 1    player 1 (X)
//   Cell.P2    = 2    player 2 (O)
//
// Move
//   move.row          int  row index, 0 = top,  2 = bottom
//   move.col          int  col index, 0 = left, 2 = right
//   new Move(row, col) constructs a move
//
// TicTacToeState  (passed to makeMove every turn)
//   state.board         int[3][3]    state.board[row][col] returns 0, 1, or 2
//   state.player        int          your player ID — 1 (X) or 2 (O)
//   state.turn          int          1-indexed move count (1 = you move first)
//   state.lastMove      Move | null  opponent's last move; null on turn 1
//   state.legalMoves    List<Move>   every valid move; you must return one
//
// Board cell checks:
//   state.board[r][c] == Cell.EMPTY          → free
//   state.board[r][c] == state.player        → your mark
//   state.board[r][c] != Cell.EMPTY &&
//   state.board[r][c] != state.player        → opponent's mark
// ─────────────────────────────────────────────────────────────────────────

public class GameBot {
    private final int playerId;

    public GameBot(int playerId) {
        this.playerId = playerId; // 1 or 2, constant for the whole game
    }

    public Move makeMove(TicTacToeState state) {
        // Take center if free
        if (state.board[1][1] == Cell.EMPTY) {
            return new Move(1, 1);
        }

        // React to opponent's last move
        if (state.lastMove != null) {
            int oppRow = state.lastMove.row;
            int oppCol = state.lastMove.col;
        }

        // Scan the board manually
        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                if (state.board[r][c] == Cell.EMPTY) {
                    // free cell at (r, c)
                }
            }
        }

        // Pick the first legal move
        return state.legalMoves.get(0);
    }
}
`,
  cpp: `// ── Available types (defined in tictactoe.h, included automatically) ──────
//
// Move  (struct)
//   move.row          int  row index, 0 = top,  2 = bottom
//   move.col          int  col index, 0 = left, 2 = right
//   Move(row, col)    constructs a move
//
// TicTacToeState  (passed to makeMove every turn)
//   state.board         vector<vector<int>>  3x3 grid
//                       state.board[row][col] returns 0, 1, or 2
//   state.player        int                  your player ID — 1 (X) or 2 (O)
//   state.turn          int                  1-indexed move count (1 = you move first)
//   state.lastMove      optional<Move>       opponent's last move; empty on turn 1
//   state.legalMoves    vector<Move>         every valid move; you must return one
//
// Cell values (raw ints, no enum):
//   0 = empty    1 = player 1 (X)    2 = player 2 (O)
//
// Board cell checks:
//   state.board[r][c] == 0                   → free
//   state.board[r][c] == state.player        → your mark
//   state.board[r][c] != 0 &&
//   state.board[r][c] != state.player        → opponent's mark
// ─────────────────────────────────────────────────────────────────────────

#include <vector>
#include <cstdlib>
using namespace std;

class GameBot {
public:
    int playerId;

    GameBot(int id) : playerId(id) {} // playerId is 1 or 2, constant for the whole game

    Move makeMove(const TicTacToeState& state) {
        // Take center if free
        if (state.board[1][1] == 0) {
            return Move(1, 1);
        }

        // React to opponent's last move
        if (state.lastMove.has_value()) {
            int oppRow = state.lastMove->row;
            int oppCol = state.lastMove->col;
        }

        // Scan the board manually
        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                if (state.board[r][c] == 0) {
                    // free cell at (r, c)
                }
            }
        }

        // Pick a random legal move
        int idx = rand() % state.legalMoves.size();
        return state.legalMoves[idx];
    }
};
`,
};

// Ludo only supports Python and JavaScript bots.
const LUDO_STARTER: Partial<Record<Lang, string>> = {
  python: `# ── Types injected by the framework (no import needed) ───────────────────
#
# The referee rolls the die for you each turn — you only pick which token
# to move. Return a token index (an int from state.legal_moves), or NO_MOVE
# if state.legal_moves is empty.
#
# Each token has a Position(zone, index):
#   zone == Zone.BASE          index -1      in the yard
#   zone == Zone.RING          index 0..51   SHARED, absolute ring square
#   zone == Zone.HOME_COLUMN   index 0..5    your private column; 5 = HOME
# RING is shared: two tokens on the same RING index sit on the same square
# (that's how captures happen). You enter the ring at START[state.color].
#
# LudoState  (passed to makeMove every turn)
#   state.tokens        tokens[playerIndex][tokenIndex] -> Position
#                         your tokens are state.tokens[state.player - 1]
#   state.dice          your roll this turn, 1-6
#   state.player        your player ID — 1 or 2
#   state.color         your Color (P1 = RED, P2 = YELLOW)
#   state.colors        {playerId: Color} for both players
#   state.turn          1-indexed move count
#   state.last_move     opponent's last token index, "NO_MOVE", or None
#   state.legal_moves   tuple of token indices you may move; return one, or NO_MOVE
# ─────────────────────────────────────────────────────────────────────────

class GameBot:
    def __init__(self, player_id: int):
        self.player_id = player_id  # 1 or 2, constant for the whole game

    def steps(self, state, pos):
        # How far a token has travelled from your start (-1 = base, 56 = HOME)
        if pos.zone == Zone.BASE:
            return -1
        if pos.zone == Zone.RING:
            return (pos.index - START[state.color]) % RING_LENGTH
        return RING_LENGTH - 1 + pos.index  # HOME_COLUMN

    def makeMove(self, state):
        if not state.legal_moves:
            return NO_MOVE

        my = state.tokens[state.player - 1]

        # Finish a token if this roll lands it exactly on HOME
        for i in state.legal_moves:
            if self.steps(state, my[i]) + state.dice == (RING_LENGTH - 2) + HOME_COLUMN_LENGTH:
                return i

        # Otherwise advance the token closest to home
        return max(state.legal_moves, key=lambda i: self.steps(state, my[i]))
`,
  javascript: `// ── Types injected by the framework (available as globals) ───────────────
//
// The referee rolls the die for you each turn — you only pick which token
// to move. Return a token index (a number from state.legalMoves), or NO_MOVE
// if state.legalMoves is empty.
//
// Each token has a Position { zone, index }:
//   zone Zone.BASE          index -1      in the yard
//   zone Zone.RING          index 0..51   SHARED, absolute ring square
//   zone Zone.HOME_COLUMN   index 0..5    your private column; 5 = HOME
// RING is shared: two tokens on the same RING index sit on the same square
// (that's how captures happen). You enter the ring at START[state.color].
//
// LudoState  (passed to makeMove every turn)
//   state.tokens        tokens[playerIndex][tokenIndex] -> Position
//                         your tokens are state.tokens[state.player - 1]
//   state.dice          your roll this turn, 1-6
//   state.player        your player ID — 1 or 2
//   state.color         your Color (P1 = RED, P2 = YELLOW)
//   state.colors        { playerId: Color } for both players
//   state.turn          1-indexed move count
//   state.lastMove      opponent's last token index, "NO_MOVE", or null
//   state.legalMoves    array of token indices you may move; return one, or NO_MOVE
// ─────────────────────────────────────────────────────────────────────────

export class GameBot {
  constructor(playerId) {
    this.playerId = playerId; // 1 or 2, constant for the whole game
  }

  steps(state, pos) {
    // How far a token has travelled from your start (-1 = base, 56 = HOME)
    if (pos.zone === Zone.BASE) return -1;
    if (pos.zone === Zone.RING) return (pos.index - START[state.color] + RING_LENGTH) % RING_LENGTH;
    return RING_LENGTH - 1 + pos.index; // HOME_COLUMN
  }

  makeMove(state) {
    if (state.legalMoves.length === 0) return NO_MOVE;

    const my = state.tokens[state.player - 1];
    const FINISH = (RING_LENGTH - 2) + HOME_COLUMN_LENGTH; // 56

    // Finish a token if this roll lands it exactly on HOME
    for (const i of state.legalMoves) {
      if (this.steps(state, my[i]) + state.dice === FINISH) return i;
    }

    // Otherwise advance the token closest to home
    return state.legalMoves.reduce((a, b) =>
      this.steps(state, my[a]) >= this.steps(state, my[b]) ? a : b
    );
  }
}
`,
  java: `// ── Available types (compiled into the container) ─────────────────────────
//
// The referee rolls the die for you each turn — you only pick which token to
// move. Return new LudoMove(i) for a token index in state.legalMoves, or
// LudoMove.NO_MOVE if state.legalMoves is empty.
//
// Position(zone, index):
//   Zone.BASE          index -1      in the yard
//   Zone.RING          index 0..51   SHARED, absolute ring square
//   Zone.HOME_COLUMN   index 0..5    your private column; 5 = HOME
// RING is shared: two tokens on the same RING index sit on the same square
// (that's how captures happen). You enter the ring at LudoState.START.get(color).
//
// LudoState:
//   state.tokens       Position[playerIndex][tokenIndex]; yours are tokens[player-1]
//   state.dice         your roll, 1-6
//   state.player       1 or 2
//   state.color        your Color (RED for P1, YELLOW for P2)
//   state.colors       Map<Integer,Color> for both players
//   state.turn         1-indexed move count
//   state.lastMove     opponent's last token index (Integer), or null
//   state.legalMoves   int[] of token indices you may move
// ─────────────────────────────────────────────────────────────────────────

public class GameBot {
    private final int playerId;

    public GameBot(int playerId) {
        this.playerId = playerId; // 1 or 2, constant for the whole game
    }

    // How far a token has travelled from your start (-1 = base, 56 = HOME)
    private int steps(LudoState state, Position p) {
        if (p.zone == Zone.BASE) return -1;
        if (p.zone == Zone.RING) {
            int start = LudoState.START.get(state.color);
            int n = LudoState.RING_LENGTH;
            return ((p.index - start) % n + n) % n;
        }
        return LudoState.RING_LENGTH - 1 + p.index; // HOME_COLUMN
    }

    public LudoMove makeMove(LudoState state) {
        if (state.legalMoves.length == 0) return LudoMove.NO_MOVE;

        Position[] my = state.tokens[state.player - 1];
        int finish = (LudoState.RING_LENGTH - 2) + LudoState.HOME_COLUMN_LENGTH; // 56

        // Finish a token if this roll lands it exactly on HOME
        for (int i : state.legalMoves) {
            if (steps(state, my[i]) + state.dice == finish) return new LudoMove(i);
        }

        // Otherwise advance the token closest to home
        int best = state.legalMoves[0];
        for (int i : state.legalMoves) {
            if (steps(state, my[i]) > steps(state, my[best])) best = i;
        }
        return new LudoMove(best);
    }
}
`,
  cpp: `// ── Available types (defined in ludo.h, included automatically) ───────────
//
// The referee rolls the die for you each turn — you only pick which token to
// move. Return LudoMove(i) for a token index in state.legalMoves, or NO_MOVE
// if state.legalMoves is empty.
//
// Position { Zone zone; int index; }:
//   Zone::BASE          index -1      in the yard
//   Zone::RING          index 0..51   SHARED, absolute ring square
//   Zone::HOME_COLUMN   index 0..5    your private column; 5 = HOME
// RING is shared: two tokens on the same RING index sit on the same square
// (that's how captures happen). You enter the ring at START.at(state.color).
//
// LudoState:
//   state.tokens       vector<vector<Position>>; yours are tokens[player-1]
//   state.dice         your roll, 1-6
//   state.player       1 or 2
//   state.color        your Color (RED for P1, YELLOW for P2)
//   state.colors       map<int,Color> for both players
//   state.turn         1-indexed move count
//   state.lastMove     optional<int> opponent's last token index
//   state.legalMoves   vector<int> of token indices you may move
// ─────────────────────────────────────────────────────────────────────────

#include "ludo.h"
#include "gamebot.h"

class GameBot {
public:
    int playerId;
    GameBot(int id) : playerId(id) {} // 1 or 2, constant for the whole game

    // How far a token has travelled from your start (-1 = base, 56 = HOME)
    int steps(const LudoState& state, const Position& p) {
        if (p.zone == Zone::BASE) return -1;
        if (p.zone == Zone::RING) {
            int start = START.at(state.color);
            return ((p.index - start) % RING_LENGTH + RING_LENGTH) % RING_LENGTH;
        }
        return RING_LENGTH - 1 + p.index; // HOME_COLUMN
    }

    LudoMove makeMove(const LudoState& state) {
        if (state.legalMoves.empty()) return NO_MOVE;

        const auto& my = state.tokens[state.player - 1];
        int finish = (RING_LENGTH - 2) + HOME_COLUMN_LENGTH; // 56

        // Finish a token if this roll lands it exactly on HOME
        for (int i : state.legalMoves)
            if (steps(state, my[i]) + state.dice == finish) return LudoMove(i);

        // Otherwise advance the token closest to home
        int best = state.legalMoves[0];
        for (int i : state.legalMoves)
            if (steps(state, my[i]) > steps(state, my[best])) best = i;
        return LudoMove(best);
    }
};
`,
};

function starterFor(game: string, lang: Lang): string {
  if (game === "ludo") {
    return LUDO_STARTER[lang] ?? LUDO_STARTER.python ?? "";
  }
  return STARTER_CODE[lang];
}

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
  const [code, setCode] = useState(() => starterFor(game, "python"));
  const [opponent, setOpponent] = useState("easy");
  const [submitting, setSubmitting] = useState(false);
  const [testRunMatchId, setTestRunMatchId] = useState<string | null>(null);
  const [submissionStarted, setSubmissionStarted] = useState(false);
  const [error, setError] = useState("");
  const [infoTab, setInfoTab] = useState<"statement" | "submissions" | "leaderboard">("statement");
  const [submissionsRefreshKey, setSubmissionsRefreshKey] = useState(0);

  function handleLangChange(newLang: Lang) {
    setLang(newLang);
    setCode(starterFor(game, newLang));
  }

  async function handleTestRun() {
    setError("");
    setSubmitting(true);
    setSubmissionStarted(false);
    setTestRunMatchId(null);
    try {
      const { match_id } = await submitTestRun(game, lang, code, opponent);
      setTestRunMatchId(match_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test run failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    setTestRunMatchId(null);
    setSubmissionStarted(false);
    try {
      await createSubmission(game, lang, code);
      setSubmissionStarted(true);
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
        <div className="ml-auto flex items-center gap-2">
          {error && <span className="text-xs text-destructive">{error}</span>}
          <div className="flex items-center gap-1 border border-border rounded-md px-2 py-1">
            <span className="text-xs text-muted-foreground mr-1">vs</span>
            <Select value={opponent} onValueChange={(v) => v && setOpponent(v)}>
              <SelectTrigger className="w-24 h-6 text-xs border-0 p-0 focus:ring-0">
                <SelectValue>
                  {opponent.charAt(0).toLocaleUpperCase() +
                    opponent.substring(1).toLocaleLowerCase()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleTestRun}
              disabled={submitting}
            >
              {submitting ? "Running…" : "Test Run"}
            </Button>
          </div>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit →"}
          </Button>
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 overflow-hidden p-3">
        {/* Desktop: 3 horizontal panels */}
        <div className="hidden md:block h-full">
          <PanelGroup orientation="horizontal">
            <Panel defaultSize={25} minSize={15}>
              <GameInfoPanel
                game={game}
                activeTab={infoTab}
                onTabChange={setInfoTab}
                submissionsRefreshKey={submissionsRefreshKey}
              />
            </Panel>
            <PanelSeparator className="w-1 bg-border hover:bg-primary/40 transition-colors cursor-col-resize" />
            <Panel defaultSize={45} minSize={25}>
              <div className="flex flex-col h-full">
                <div className="flex items-center px-3 py-1.5 border-b border-border bg-background shrink-0">
                  <Select value={lang} onValueChange={(v) => handleLangChange(v as Lang)}>
                    <SelectTrigger className="w-32 h-7 text-xs">
                      <SelectValue>{LANG_LABELS[lang]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
                        <SelectItem key={l} value={l}>
                          {LANG_LABELS[l]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
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
              </div>
            </Panel>
            <PanelSeparator className="w-1 bg-border hover:bg-primary/40 transition-colors cursor-col-resize" />
            <Panel defaultSize={30} minSize={20}>
              {submissionStarted ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                  <span className="text-4xl">🚀</span>
                  <div>
                    <p className="font-semibold text-foreground">
                      Submission queued
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Running 15 matches across Easy, Medium, and Hard.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setInfoTab("submissions");
                      setSubmissionsRefreshKey((k) => k + 1);
                    }}
                  >
                    View progress →
                  </Button>
                </div>
              ) : (
                <ResultsPanel matchId={testRunMatchId} />
              )}
            </Panel>
          </PanelGroup>
        </div>

        {/* Mobile: stacked */}
        <div className="md:hidden flex flex-col h-full overflow-auto">
          <div className="border-b border-border">
            <GameInfoPanel
              game={game}
              activeTab={infoTab}
              onTabChange={setInfoTab}
              submissionsRefreshKey={submissionsRefreshKey}
            />
          </div>
          <div className="h-72 shrink-0 flex flex-col">
            <div className="flex items-center px-3 py-1.5 border-b border-border bg-background shrink-0">
              <Select value={lang} onValueChange={(v) => handleLangChange(v as Lang)}>
                <SelectTrigger className="w-32 h-7 text-xs">
                  <SelectValue>{LANG_LABELS[lang]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
                    <SelectItem key={l} value={l}>
                      {LANG_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
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
          </div>
          <div className="border-t border-border flex-1">
            {submissionStarted ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                <span className="text-4xl">🚀</span>
                <div>
                  <p className="font-semibold text-foreground">
                    Submission queued
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Running 15 matches across Easy, Medium, and Hard.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setInfoTab("submissions");
                    setSubmissionsRefreshKey((k) => k + 1);
                  }}
                >
                  View progress →
                </Button>
              </div>
            ) : (
              <ResultsPanel matchId={testRunMatchId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
