"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getTestRun, getTestRunCode } from "@/lib/api";
import type { TestRunDetail, CodeResponse } from "@/lib/api";
import Board from "@/components/Board";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronLeft, ChevronDown } from "lucide-react";

export default function TestRunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = params.id as string;
  const backHref = searchParams.get("from") ?? "/test-runs";
  const backLabel = backHref.startsWith("/submissions/")
    ? "Submission"
    : backHref === "/submissions"
      ? "Submissions"
      : "Test Runs";

  const [match, setMatch] = useState<TestRunDetail | null>(null);
  const [codeData, setCodeData] = useState<CodeResponse | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await getTestRun(matchId);
        if (cancelled) return;
        setMatch(data);
        if (data.status === "pending" || data.status === "running") {
          setTimeout(poll, 1500);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load match");
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  async function loadCode() {
    if (codeData) return;
    try {
      const data = await getTestRunCode(matchId);
      setCodeData(data);
    } catch {
      // ignore
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive text-sm">{error}</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => router.push(backHref)}
        >
          ← Back
        </Button>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-6 text-muted-foreground animate-pulse text-sm">
        Loading…
      </div>
    );
  }

  const { result, status } = match;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(backHref)}
        >
          <ChevronLeft className="size-4 mr-1" /> {backLabel}
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">Test Run</h1>
        <code className="text-sm text-muted-foreground font-mono">
          #{match.match_id}
        </code>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Game" value={match.game} capitalize />
            <Row label="Language" value={match.lang} />
            <Row label="Opponent" value={match.opponent ?? "—"} capitalize />
            <Row label="You played as" value="X (first)" />
            {result && (
              <>
                <Row label="Turns" value={String(result.turn)} />
                <Row label="Reason" value={result.reason.replace("_", " ")} />
                <Row
                  label="Outcome"
                  value={
                    result.is_draw
                      ? "Draw"
                      : result.winner_player === 1
                        ? "Won"
                        : "Lost"
                  }
                  highlight={
                    result.is_draw
                      ? "neutral"
                      : result.winner_player === 1
                        ? "win"
                        : "loss"
                  }
                />
              </>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Final Board</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Board board={result.board} />
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="text-primary font-semibold">X — You</span>
                <span className="text-destructive font-semibold">
                  O — Opponent
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {status === "failed" && match.error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {match.error}
        </div>
      )}

      {result?.bot_logs?.length ? (
        <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
            <ChevronDown
              className={`size-4 transition-transform ${logsOpen ? "rotate-180" : ""}`}
            />
            Bot Logs
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 space-y-3">
              {result.bot_logs.map((log, i) => (
                <div key={i}>
                  <p className="text-xs text-muted-foreground mb-1">
                    {i === 0 ? "Your bot" : "Opponent"} output
                  </p>
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-48 font-mono whitespace-pre-wrap">
                    {log || "(no output)"}
                  </pre>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      <Collapsible
        open={codeOpen}
        onOpenChange={(open) => {
          setCodeOpen(open);
          if (open) loadCode();
        }}
      >
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
          <ChevronDown
            className={`size-4 transition-transform ${codeOpen ? "rotate-180" : ""}`}
          />
          View Submitted Code
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-3 text-xs bg-muted rounded-lg p-3 overflow-auto max-h-96 font-mono whitespace-pre-wrap">
            {codeData ? codeData.code : "Loading…"}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function Row({
  label,
  value,
  capitalize,
  highlight,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
  highlight?: "win" | "loss" | "neutral";
}) {
  const valueClass =
    highlight === "win"
      ? "text-primary font-semibold"
      : highlight === "loss"
        ? "text-destructive font-semibold"
        : "text-foreground";

  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${valueClass} ${capitalize ? "capitalize" : ""}`}>
        {value}
      </span>
    </div>
  );
}
