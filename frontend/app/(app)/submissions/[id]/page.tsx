"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSubmission } from "@/lib/api";
import type { SubmissionDetail, SubmissionMatchDetail } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

function matchScore(m: SubmissionMatchDetail): string {
  if (m.status !== "completed" || m.points_earned === null) return "—";
  return `${m.points_earned}`;
}

function outcomeLabel(m: SubmissionMatchDetail): string {
  if (m.status === "pending" || m.status === "running") return "—";
  if (m.status === "failed") return "Error";
  if (m.is_draw) return "Draw";
  return m.winner_player === 1 ? "Win" : "Loss";
}

function outcomeClass(m: SubmissionMatchDetail): string {
  if (m.status === "failed") return "text-destructive";
  if (m.is_draw) return "text-muted-foreground";
  if (m.winner_player === 1) return "text-green-500";
  if (m.winner_player === 2) return "text-destructive";
  return "text-muted-foreground";
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-yellow-500";
  return "text-destructive";
}

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await getSubmission(submissionId);
        if (cancelled) return;
        setSubmission(data);
        if (data.status === "pending" || data.status === "running") {
          setTimeout(poll, 2000);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => router.push("/submissions")}>
          ← Back
        </Button>
      </div>
    );
  }

  if (!submission) {
    return <div className="p-6 text-muted-foreground animate-pulse text-sm">Loading…</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/submissions")}>
          <ChevronLeft className="size-4 mr-1" /> Submissions
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground capitalize">{submission.game}</h1>
        <StatusBadge status={submission.status} />
        <span className="text-sm text-muted-foreground">{submission.lang}</span>
      </div>

      {/* Score + stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Score</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {submission.status === "completed" && submission.score !== null ? (
              <span className={`text-3xl font-bold ${scoreColor(submission.score)}`}>
                {submission.score.toFixed(1)}
              </span>
            ) : (
              <span className="text-2xl text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Wins</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <span className="text-3xl font-bold text-green-500">{submission.wins}</span>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Draws</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <span className="text-3xl font-bold text-muted-foreground">{submission.draws}</span>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Losses</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <span className="text-3xl font-bold text-destructive">{submission.losses}</span>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        {submission.matches_completed} / {submission.total_matches} matches completed
      </p>

      {/* Matches grouped by difficulty */}
      <div className="space-y-4">
        {DIFFICULTIES.map((diff) => {
          const matches = submission.matches.filter((m) => m.opponent === diff);
          if (!matches.length) return null;
          return (
            <div key={diff} className="rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-2 bg-muted/40 border-b border-border">
                <span className="text-sm font-semibold capitalize">{diff}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {matches.filter((m) => m.winner_player === 1).length}W ·{" "}
                  {matches.filter((m) => m.is_draw).length}D ·{" "}
                  {matches.filter((m) => m.winner_player === 2).length}L
                </span>
              </div>
              <div className="divide-y divide-border">
                {matches.map((m) => (
                  <Link
                    key={m.match_id}
                    href={`/test-runs/${m.match_id}?from=/submissions/${submissionId}`}
                    className="flex items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <StatusBadge status={m.status} />
                    <span className={`font-medium ${outcomeClass(m)}`}>
                      {outcomeLabel(m)}
                    </span>
                    {m.reason && m.status === "completed" && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {m.reason.replace("_", " ")}
                      </span>
                    )}
                    <span className="font-mono text-xs text-muted-foreground">
                      {matchScore(m)} pts
                    </span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {m.match_id.slice(0, 8)} →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
