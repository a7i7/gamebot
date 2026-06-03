"use client";

import { useState } from "react";
import { SubmissionsTab } from "@/components/SubmissionsTab";
import { LeaderboardTab } from "@/components/LeaderboardTab";

const GAME_INFO: Record<string, { name: string; emoji: string; description: string; protocol: string }> = {
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
