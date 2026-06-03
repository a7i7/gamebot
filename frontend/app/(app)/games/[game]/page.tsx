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
  const [testRunMatchId, setTestRunMatchId] = useState<string | null>(null);
  const [submissionStarted, setSubmissionStarted] = useState(false);
  const [error, setError] = useState("");
  const [infoTab, setInfoTab] = useState<"statement" | "submissions" | "leaderboard">("statement");
  const [submissionsRefreshKey, setSubmissionsRefreshKey] = useState(0);

  function handleLangChange(newLang: Lang) {
    setLang(newLang);
    setCode(STARTER_CODE[newLang]);
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
