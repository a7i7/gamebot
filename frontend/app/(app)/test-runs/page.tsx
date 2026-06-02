"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listTestRuns } from "@/lib/api";
import type { TestRunSummary } from "@/lib/api";
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

export default function TestRunsPage() {
  const [runs, setRuns] = useState<TestRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await listTestRuns();
      setRuns(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const hasActive = runs.some(
      (r) => r.status === "pending" || r.status === "running"
    );
    if (!hasActive) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [runs]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Test Runs</h1>
          <p className="text-muted-foreground mt-1">
            Single matches for quick feedback. No score.
          </p>
        </div>
        <Link href="/">
          <Button size="sm">+ New Test Run</Button>
        </Link>
      </div>

      {loading && (
        <p className="text-muted-foreground text-sm animate-pulse">Loading…</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && runs.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-5xl mb-4">🎮</p>
          <p>No test runs yet.</p>
          <Link href="/">
            <Button variant="outline" className="mt-4" size="sm">
              Run your first test →
            </Button>
          </Link>
        </div>
      )}

      {runs.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Opponent</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow
                  key={r.match_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    (window.location.href = `/test-runs/${r.match_id}`)
                  }
                >
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="capitalize">{r.game}</TableCell>
                  <TableCell className="text-muted-foreground">{r.lang}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {r.opponent ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {relativeTime(r.submitted_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
