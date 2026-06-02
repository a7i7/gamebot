"use client";

import { useEffect, useState } from "react";
import { getMatch } from "@/lib/api";
import type { MatchDetail } from "@/lib/api";
import Board from "@/components/Board";
import StatusBadge from "@/components/StatusBadge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface ResultsPanelProps {
  matchId: string | null;
}

export function ResultsPanel({ matchId }: ResultsPanelProps) {
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [logsOpen, setLogsOpen] = useState(true);

  useEffect(() => {
    if (!matchId) {
      setMatch(null);
      return;
    }
    let cancelled = false;

    async function poll() {
      try {
        const data = await getMatch(matchId!);
        if (cancelled) return;
        setMatch(data);
        if (data.status === "pending" || data.status === "running") {
          setTimeout(poll, 1500);
        }
      } catch {
        if (!cancelled) setTimeout(poll, 2000);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (!matchId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-8 text-center">
        <span className="text-4xl">📊</span>
        <p className="text-sm">
          Results will appear here after you run or submit your bot.
        </p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <span className="animate-pulse text-sm">Loading…</span>
      </div>
    );
  }

  const { status, result } = match;
  const isPending = status === "pending" || status === "running";

  return (
    <div className="p-4 space-y-4 h-full overflow-auto">
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        <span className="text-xs text-muted-foreground font-mono">
          #{match.match_id}
        </span>
      </div>

      {isPending && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm animate-pulse">
          <span>Running match…</span>
        </div>
      )}

      {status === "failed" && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {match.error ?? "An error occurred during execution."}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Result banner */}
          <div
            className={`rounded-lg p-4 text-center font-semibold text-lg border ${
              result.is_draw
                ? "bg-muted border-border text-foreground"
                : result.winner_player === 1
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            {result.is_draw
              ? "🤝 Draw"
              : result.winner_player === 1
                ? "🏆 You Won!"
                : "😔 You Lost"}
            <p className="text-xs font-normal text-muted-foreground mt-1">
              {result.turn} turn{result.turn !== 1 ? "s" : ""} ·{" "}
              {result.reason.replace("_", " ")}
            </p>
          </div>

          {/* Board */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Final Board
            </p>
            <Board board={result.board} />
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="text-primary font-semibold">X — You</span>
              <span className="text-destructive font-semibold">
                O — Opponent
              </span>
            </div>
          </div>

          {/* Logs */}
          {result.bot_logs?.length > 0 && (
            <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown
                  className={`size-3 transition-transform ${logsOpen ? "rotate-180" : ""}`}
                />
                Bot Logs
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2">
                  {result.bot_logs.map((log, i) => (
                    <div key={i}>
                      <p className="text-xs text-muted-foreground mb-1">
                        {i === 0 ? "Your bot" : "Opponent"} output
                      </p>
                      <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-32 font-mono whitespace-pre-wrap">
                        {log || "(no output)"}
                      </pre>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}
