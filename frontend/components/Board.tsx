"use client";

interface BoardProps {
  board: number[][];
  legalMoves?: number[][];
  onMove?: (move: number[]) => void;
  disabled?: boolean;
}

const SYMBOLS: Record<number, string> = { 0: "", 1: "X", 2: "O" };
const COLORS: Record<number, string> = {
  0: "text-muted-foreground",
  1: "text-primary",
  2: "text-destructive",
};

export default function Board({ board, legalMoves, onMove, disabled }: BoardProps) {
  return (
    <div className={`inline-grid grid-cols-3 gap-1 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      {board.flatMap((row, r) =>
        row.map((cell, c) => {
          const isLegal = legalMoves?.some((m) => m[0] === r && m[1] === c) ?? false;
          return (
            <div
              key={`${r}-${c}`}
              onClick={() => isLegal && onMove && onMove([r, c])}
              className={[
                "w-16 h-16 flex items-center justify-center border border-border rounded-lg text-3xl font-bold bg-card",
                isLegal && onMove ? "cursor-pointer ring-2 ring-primary/60 hover:bg-primary/10" : "",
              ].join(" ")}
            >
              <span className={COLORS[cell]}>{SYMBOLS[cell]}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
