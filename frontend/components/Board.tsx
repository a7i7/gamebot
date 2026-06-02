"use client";

interface BoardProps {
  board: number[][];
}

const SYMBOLS: Record<number, string> = { 0: "", 1: "X", 2: "O" };
const COLORS: Record<number, string> = {
  0: "text-muted-foreground",
  1: "text-primary",
  2: "text-destructive",
};

export default function Board({ board }: BoardProps) {
  return (
    <div className="inline-grid grid-cols-3 gap-1">
      {board.flat().map((cell, i) => (
        <div
          key={i}
          className="w-16 h-16 flex items-center justify-center border border-border rounded-lg text-3xl font-bold bg-card"
        >
          <span className={COLORS[cell]}>{SYMBOLS[cell]}</span>
        </div>
      ))}
    </div>
  );
}
