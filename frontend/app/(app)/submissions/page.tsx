"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { listSubmissions, getSubmission } from "@/lib/api";
import type {
  SubmissionSummary,
  SubmissionDetail,
  SubmissionMatchDetail,
} from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-500 font-bold";
  if (score >= 50) return "text-yellow-500 font-bold";
  return "text-destructive font-bold";
}

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

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

function ExpandedMatches({ detail }: { detail: SubmissionDetail }) {
  return (
    <div className="bg-muted/30 border-t border-border">
      {DIFFICULTIES.map((diff) => {
        const matches = detail.matches.filter((m) => m.opponent === diff);
        if (!matches.length) return null;
        return (
          <div key={diff} className="px-6 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 capitalize">
              {diff}
            </p>
            <div className="space-y-1">
              {matches.map((m) => (
                <Link
                  key={m.match_id}
                  href={`/test-runs/${m.match_id}?from=/submissions`}
                  className="flex items-center gap-4 text-sm py-1 hover:text-foreground transition-colors"
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
  );
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Record<string, SubmissionDetail>>({});

  async function load() {
    try {
      const data = await listSubmissions();
      setSubmissions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    listSubmissions()
      .then(setSubmissions)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const hasActive = submissions.some(
      (s) => s.status === "pending" || s.status === "running",
    );
    if (!hasActive) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [submissions]);

  async function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    if (!details[id]) {
      try {
        const data = await getSubmission(id);
        setDetails((prev) => ({ ...prev, [id]: data }));
      } catch {
        // ignore — row stays expanded but empty
      }
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Submissions</h1>
          <p className="text-muted-foreground mt-1">
            Scored runs across all difficulties. 15 matches per submission.
          </p>
        </div>
        <Link href="/">
          <Button size="sm">+ New Submission</Button>
        </Link>
      </div>

      {loading && (
        <p className="text-muted-foreground text-sm animate-pulse">Loading…</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && submissions.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-5xl mb-4">📭</p>
          <p>No submissions yet.</p>
          <Link href="/">
            <Button variant="outline" className="mt-4" size="sm">
              Submit your first bot →
            </Button>
          </Link>
        </div>
      )}

      {submissions.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Status</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((s) => {
                const isExpanded = expanded.has(s.submission_id);
                const detail = details[s.submission_id];
                return (
                  <Fragment key={s.submission_id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpand(s.submission_id)}
                    >
                      <TableCell className="pl-4 pr-0">
                        {isExpanded ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="capitalize">{s.game}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.lang}
                      </TableCell>
                      <TableCell>
                        {s.status === "completed" && s.score !== null ? (
                          <span className={scoreColor(s.score)}>
                            {s.score.toFixed(1)}
                          </span>
                        ) : s.status === "failed" ? (
                          <span className="text-destructive text-sm">—</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {s.matches_completed}/{s.total_matches}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {relativeTime(s.created_at)}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <tr key={`${s.submission_id}-expanded`}>
                        <td colSpan={7} className="p-0">
                          {detail ? (
                            <ExpandedMatches detail={detail} />
                          ) : (
                            <div className="px-6 py-4 text-sm text-muted-foreground animate-pulse bg-muted/30">
                              Loading matches…
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
