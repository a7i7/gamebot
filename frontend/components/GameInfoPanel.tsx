"use client";

import { useState } from "react";
import { SubmissionsTab } from "@/components/SubmissionsTab";
import { LeaderboardTab } from "@/components/LeaderboardTab";

const GAME_INFO: Record<string, { name: string; emoji: string; description: string; movement?: string; rules?: string; protocol: string }> = {
  tictactoe: {
    name: "Tic-Tac-Toe",
    emoji: "🎯",
    description:
      "Classic 3×3 grid game. You are Player 1 (X). Your bot plays against a random opponent (O). First to get three in a row — horizontally, vertically, or diagonally — wins.",
    protocol: `Implement a GameBot class with:

  __init__(player_id)   — called once before the game starts
  makeMove(state)       — called each turn, return a Move

The state object has:
  state.board        3×3 grid of cell values
                       0 = empty, 1 = P1 (X), 2 = P2 (O)
  state.player       your player ID — 1 (X) or 2 (O)
  state.turn         move number, 1-indexed
  state.last_move    opponent's last Move(row, col),
                       or None on your first turn
  state.legal_moves  tuple of valid Move(row, col) values

Return one of the Move objects from state.legal_moves.
Instance variables set in __init__ persist across turns.
You have 1 second per move.`,
  },
  ludo: {
    name: "Ludo",
    emoji: "🎲",
    description:
      "2-player Ludo, 4 tokens each (Player 1 = Red, Player 2 = Yellow). The referee rolls the die and tells you whose turn it is — you only choose which token to move. Roll a 6 to leave base; a 6 grants another turn. Land on an opponent to send it back to base. First to get all four tokens HOME wins.",
    movement: `Each token makes a single journey: BASE → RING → HOME_COLUMN → HOME.

BASE (zone = BASE, index = -1)
  All 4 of your tokens start here. A token stuck in base
  contributes nothing and can be captured by the opponent.
  To leave base you must roll a 6.

RING (zone = RING, index 0 – 51)
  The ring is a 52-square loop shared by both players.
  Indices are ABSOLUTE — Player 1 and Player 2 read the same
  numbers. "ring 5" is the same physical square regardless of
  whose token is there.

  Where you enter:
    Player 1 (Red)    → enters at ring index 0
    Player 2 (Yellow) → enters at ring index 26

  On a roll of 6:    token leaves base onto your entry square.
  Otherwise:         advance the token that many squares clockwise.
                     ring index wraps: after 51 comes 0.

  How far to travel: from your entry square you travel exactly
  51 squares around the ring before turning into your home column.
  Token at ring index r has travelled:
    (r - entry) mod 52   steps from your start.

  Captures: if you land on a square occupied by an OPPONENT token,
  that token is sent back to BASE. Since the ring is shared, you
  detect a capture simply by comparing ring indices.
  Your own tokens may share a square (no self-capture).

HOME_COLUMN (zone = HOME_COLUMN, index 0 – 5)
  After completing the ring loop, your token enters a private
  column only you can use (opponent tokens never enter here).
  index 0 is the entrance; index 5 is HOME (finished).
  You need an EXACT roll to reach index 5 — overshooting is not
  allowed and that token cannot move on this turn.

Summary:
  base → (roll 6) → ring entry → ... 51 ring squares ...
       → home_col 0 → 1 → 2 → 3 → 4 → (exact roll) → home_col 5 = HOME
  First player with all 4 tokens at HOME wins.`,
    rules: `Rules in effect:
  • 2 players, 4 tokens each. P1 = Red (enters ring at 0),
    P2 = Yellow (enters at 26).
  • The referee rolls one die (1-6) each turn; you only pick
    which of your tokens to move.
  • A token leaves base only on a roll of 6, onto its start square.
  • Rolling a 6 grants another turn.
  • Capture: landing on a ring square holding an opponent token
    sends that token back to base.
  • Exact finish: a token reaches HOME only on an exact roll;
    an overshoot is not a legal move for that token.
  • Your own tokens may share a square (stacking is allowed).
  • If you have no legal move, you must pass (return NO_MOVE).
  • First player with all 4 tokens HOME wins. A long game is
    capped; if reached, the player with more total progress wins.

Standard Ludo rules intentionally OMITTED:
  • Capturing does NOT grant an extra turn.
  • Reaching HOME does NOT grant an extra turn.
  • No safe / star squares — every ring square is capturable.
  • No blockades — two of your tokens on a square do not block
    opponents from passing or landing.
  • No "three consecutive 6s forfeits the turn" rule.
  • 2 players only (not the 4-player game).`,
    protocol: `Implement a GameBot class with:

  __init__(player_id)   — called once before the game starts
  makeMove(state)       — called each turn, return a token index

Each token has a Position(zone, index):
  Zone.BASE          index -1      in the yard
  Zone.RING          index 0..51   SHARED, absolute ring square
  Zone.HOME_COLUMN   index 0..5    private column; 5 = HOME
Two tokens on the same RING index share a square — that is how
captures work. You enter the ring at START[state.color].

The state object has:
  state.tokens       tokens[playerIndex][tokenIndex] -> Position
                       your tokens are tokens[player - 1]
  state.dice         your roll this turn, 1-6
  state.player       your player ID — 1 or 2
  state.color        your color (Red or Yellow)
  state.colors       {playerId: color} for both players
  state.turn         move number, 1-indexed
  state.last_move    opponent's last token index / "NO_MOVE" / None
  state.legal_moves  token indices you may move this turn

Return one of state.legal_moves (a token index), or NO_MOVE
if state.legal_moves is empty. You have 1 second per move.`,
  },
};

type Tab = "statement" | "submissions" | "leaderboard";

const TABS: { id: Tab; label: string }[] = [
  { id: "statement", label: "Statement" },
  { id: "submissions", label: "Submissions" },
  { id: "leaderboard", label: "Leaderboard" },
];

interface GameInfoPanelProps {
  game: string;
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
  submissionsRefreshKey?: number;
}

export function GameInfoPanel({ game, activeTab: controlledTab, onTabChange, submissionsRefreshKey }: GameInfoPanelProps) {
  const [internalTab, setInternalTab] = useState<Tab>("statement");
  const activeTab = controlledTab ?? internalTab;
  function setActiveTab(tab: Tab) {
    setInternalTab(tab);
    onTabChange?.(tab);
  }
  const info = GAME_INFO[game];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-foreground border-b-2 border-primary -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "statement" && (
          <>
            {!info ? (
              <div className="p-4 text-muted-foreground text-sm">
                No information available for this game.
              </div>
            ) : (
              <div className="p-4 space-y-5">
                <div>
                  <div className="text-3xl mb-2">{info.emoji}</div>
                  <h2 className="text-xl font-bold text-foreground">{info.name}</h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{info.description}</p>
                </div>
                {info.movement && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      How Tokens Move
                    </h3>
                    <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto font-mono whitespace-pre-wrap leading-relaxed text-foreground">
                      {info.movement}
                    </pre>
                  </div>
                )}
                {info.rules && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Rules
                    </h3>
                    <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto font-mono whitespace-pre-wrap leading-relaxed text-foreground">
                      {info.rules}
                    </pre>
                  </div>
                )}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Bot Protocol
                  </h3>
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto font-mono whitespace-pre-wrap leading-relaxed text-foreground">
                    {info.protocol}
                  </pre>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "submissions" && (
          <SubmissionsTab game={game} refreshKey={submissionsRefreshKey} />
        )}

        {activeTab === "leaderboard" && (
          <LeaderboardTab game={game} />
        )}
      </div>
    </div>
  );
}
