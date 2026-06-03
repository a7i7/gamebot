"use client";

import { useEffect, useState } from "react";
import { getLeaderboard } from "@/lib/api";
import type { LeaderboardEntry } from "@/lib/api";

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-yellow-500";
  return "text-destructive";
}

function rankDisplay(rank: number): { label: string; className: string } {
  if (rank === 1) return { label: "🥇", className: "" };
  if (rank === 2) return { label: "🥈", className: "" };
  if (rank === 3) return { label: "🥉", className: "" };
  return { label: `#${rank}`, className: "text-muted-foreground text-xs font-mono" };
}

interface Props {
  game: string;
}

export function LeaderboardTab({ game }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getLeaderboard(game)
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [game]);

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground animate-pulse">
        Loading…
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-sm text-destructive">{error}</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground text-sm p-6 text-center">
        <span className="text-3xl">🏆</span>
        <p>No scores yet.</p>
        <p className="text-xs">Be the first to submit a bot!</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {entries.map((entry) => {
        const rank = rankDisplay(entry.rank);
        return (
          <div
            key={entry.username}
            className="flex items-center gap-3 px-3 py-2.5"
          >
            <span className={`w-7 text-center shrink-0 ${rank.className}`}>
              {rank.label}
            </span>
            <span className="flex-1 text-sm font-medium truncate">
              {entry.username}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground font-mono">
                {entry.wins}W {entry.draws}D {entry.losses}L
              </span>
              <span className={`text-sm font-bold w-12 text-right ${scoreColor(entry.score)}`}>
                {entry.score.toFixed(1)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
