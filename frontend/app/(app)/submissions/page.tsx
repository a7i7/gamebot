"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listMatches } from "@/lib/api";
import type { MatchSummary } from "@/lib/api";
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

export default function SubmissionsPage() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await listMatches();
      setMatches(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Auto-refresh while any match is running/pending
  useEffect(() => {
    const hasActive = matches.some(
      (m) => m.status === "pending" || m.status === "running"
    );
    if (!hasActive) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [matches]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Submissions</h1>
          <p className="text-muted-foreground mt-1">Your match history.</p>
        </div>
        <Link href="/">
          <Button size="sm">+ New Submission</Button>
        </Link>
      </div>

      {loading && (
        <p className="text-muted-foreground text-sm animate-pulse">Loading…</p>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {!loading && matches.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-5xl mb-4">📭</p>
          <p>No submissions yet.</p>
          <Link href="/">
            <Button variant="outline" className="mt-4" size="sm">Submit your first bot →</Button>
          </Link>
        </div>
      )}

      {matches.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((m) => (
                <TableRow
                  key={m.match_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => window.location.href = `/submissions/${m.match_id}`}
                >
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                  <TableCell className="capitalize">{m.game}</TableCell>
                  <TableCell className="text-muted-foreground">{m.lang}</TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {relativeTime(m.submitted_at)}
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
