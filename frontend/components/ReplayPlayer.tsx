"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import type { MoveRecord } from "@/lib/api";
import Board from "@/components/Board";
import LudoBoard from "@/components/LudoBoard";
import type { LudoBoardData } from "@/components/LudoBoard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SPEEDS: Record<string, number> = {
  slow: 1000,
  normal: 500,
  fast: 150,
};

interface ReplayPlayerProps {
  moves: MoveRecord[];
  game: string;
  userPlayer: number | null;
}

function formatMove(record: MoveRecord): string {
  if (record.turn === 0) return "Initial state";
  const who = record.player === 1 ? "You" : "Opponent";
  if (Array.isArray(record.move)) {
    const [r, c] = record.move as number[];
    return `Turn ${record.turn} — ${who} played row ${r}, col ${c}`;
  }
  if (record.move === "NO_MOVE") return `Turn ${record.turn} — ${who} passed`;
  if (typeof record.move === "number")
    return `Turn ${record.turn} — ${who} moved token ${record.move}`;
  return `Turn ${record.turn} — ${who}`;
}

export default function ReplayPlayer({ moves, game, userPlayer }: ReplayPlayerProps) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("normal");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = moves.length - 1;
  const current = moves[step];

  useEffect(() => {
    if (!playing) return;
    timerRef.current = setTimeout(() => {
      setStep((s) => {
        if (s >= total) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, SPEEDS[speed]);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, step, speed, total]);

  function go(next: number) {
    setStep(Math.max(0, Math.min(total, next)));
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground font-medium min-h-[1.25rem]">
        {formatMove(current)}
      </div>

      {game === "ludo" ? (
        <LudoBoard board={current.board as LudoBoardData} userPlayer={userPlayer} />
      ) : (
        <div className="space-y-2">
          <Board board={current.board as number[][]} />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="text-primary font-semibold">X — You</span>
            <span className="text-destructive font-semibold">O — Opponent</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => { setPlaying(false); go(0); }} disabled={step === 0}>
          <ChevronsLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => { setPlaying(false); go(step - 1); }} disabled={step === 0}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPlaying((p) => !p)}
          disabled={step === total}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => { setPlaying(false); go(step + 1); }} disabled={step === total}>
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => { setPlaying(false); go(total); }} disabled={step === total}>
          <ChevronsRight className="size-4" />
        </Button>

        <span className="text-xs text-muted-foreground ml-2 tabular-nums">
          {step} / {total}
        </span>

        <div className="ml-auto">
          <Select value={speed} onValueChange={(v) => { if (v) setSpeed(v); }}>
            <SelectTrigger className="h-7 text-xs w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slow">Slow</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="fast">Fast</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={total}
        value={step}
        onChange={(e) => { setPlaying(false); go(Number(e.target.value)); }}
        className="w-full accent-primary"
      />
    </div>
  );
}
