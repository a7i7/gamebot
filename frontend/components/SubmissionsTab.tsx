"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { listSubmissions, getSubmission } from "@/lib/api";
import { scoreColor } from "@/lib/scoring";
import type { SubmissionSummary, SubmissionDetail, SubmissionMatchDetail } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function outcomeLabel(m: SubmissionMatchDetail): string {
  if (m.status === "pending" || m.status === "running") return "—";
  if (m.status === "failed") return "Err";
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
    <div className="bg-muted/30 border-t border-border px-3 py-2 space-y-3">
      {DIFFICULTIES.map((diff) => {
        const matches = detail.matches.filter((m) => m.opponent === diff);
        if (!matches.length) return null;
        return (
          <div key={diff}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 capitalize">
              {diff}
            </p>
            <div className="space-y-0.5">
              {matches.map((m) => (
                <Link
                  key={m.match_id}
                  href={`/test-runs/${m.match_id}?from=/submissions`}
                  className="flex items-center gap-2 text-xs py-0.5 hover:text-foreground transition-colors text-muted-foreground"
                >
                  <span className={`font-medium w-8 ${outcomeClass(m)}`}>
                    {outcomeLabel(m)}
                  </span>
                  {m.points_earned !== null && (
                    <span className="font-mono">{m.points_earned}pts</span>
                  )}
                  <span className="ml-auto font-mono opacity-60">
                    {m.match_id.slice(0, 6)} →
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

interface Props {
  game: string;
  refreshKey?: number;
}

export function SubmissionsTab({ game, refreshKey = 0 }: Props) {
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Record<string, SubmissionDetail>>({});

  async function load() {
    try {
      const data = await listSubmissions();
      setSubmissions(data.filter((s) => s.game === game));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, [game, refreshKey]);

  useEffect(() => {
    const hasActive = submissions.some(
      (s) => s.status === "pending" || s.status === "running"
    );
    if (!hasActive) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [submissions]);

  async function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!details[id]) {
      try {
        const data = await getSubmission(id);
        setDetails((prev) => ({ ...prev, [id]: data }));
      } catch {
        // row stays expanded but empty
      }
    }
  }

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

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground text-sm p-6 text-center">
        <span className="text-3xl">📭</span>
        <p>No submissions yet.</p>
        <p className="text-xs">Hit Submit → to queue your first scored run.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {submissions.map((s) => {
        const isExpanded = expanded.has(s.submission_id);
        const detail = details[s.submission_id];
        return (
          <Fragment key={s.submission_id}>
            <button
              className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors"
              onClick={() => toggleExpand(s.submission_id)}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                )}
                <StatusBadge status={s.status} />
                <span className="text-xs text-muted-foreground font-mono uppercase ml-1">
                  {s.lang}
                </span>
                <span className="ml-auto">
                  {s.status === "completed" && s.score !== null ? (
                    <span className={`text-sm font-bold ${scoreColor(s.score, s.game)}`}>
                      {s.score.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {s.matches_completed}/{s.total_matches}
                    </span>
                  )}
                </span>
              </div>
              <div className="pl-5 mt-0.5 text-xs text-muted-foreground">
                {relativeTime(s.created_at)}
              </div>
            </button>

            {isExpanded && (
              detail ? (
                <ExpandedMatches detail={detail} />
              ) : (
                <div className="px-4 py-3 text-xs text-muted-foreground animate-pulse bg-muted/30">
                  Loading matches…
                </div>
              )
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
