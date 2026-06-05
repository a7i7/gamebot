"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { LudoBoardData } from "@/components/LudoBoard";

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

// ── Coordinate maps (15×15 grid, 0-indexed) ──────────────────────────────────

// 52 ring squares, clockwise from RED's safe square at (6,1)
const RING: [number, number][] = [
  // RED safe → right along row 6
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],
  // turn up col 6
  [5, 6],
  [4, 6],
  [3, 6],
  [2, 6],
  [1, 6],
  [0, 6],
  // across row 0
  [0, 7],
  [0, 8],
  // GREEN safe → down col 8
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  // right along row 6
  [6, 9],
  [6, 10],
  [6, 11],
  [6, 12],
  [6, 13],
  [6, 14],
  // down col 14
  [7, 14],
  [8, 14],
  // YELLOW safe → left along row 8
  [8, 13],
  [8, 12],
  [8, 11],
  [8, 10],
  [8, 9],
  // down col 8
  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8],
  [13, 8],
  [14, 8],
  // across row 14
  [14, 7],
  [14, 6],
  // BLUE safe → up col 6
  [13, 6],
  [12, 6],
  [11, 6],
  [10, 6],
  [9, 6],
  // left along row 8
  [8, 5],
  [8, 4],
  [8, 3],
  [8, 2],
  [8, 1],
  [8, 0],
  // up col 0
  [7, 0],
  [6, 0],
];

// Home columns: 6 squares per color. Index 0 = entry, 5 = finish (adjacent to center).
const HOME_COL: Record<string, [number, number][]> = {
  RED: [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
    [7, 6],
  ],
  GREEN: [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
    [6, 7],
  ],
  YELLOW: [
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
    [7, 8],
  ],
  BLUE: [
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
    [8, 7],
  ],
};

// 4 base token slots inside each corner home area
const BASE_SLOTS: Record<string, [number, number][]> = {
  RED: [
    [1, 1],
    [1, 3],
    [3, 1],
    [3, 3],
  ],
  GREEN: [
    [1, 10],
    [1, 12],
    [3, 10],
    [3, 12],
  ],
  YELLOW: [
    [10, 10],
    [10, 12],
    [12, 10],
    [12, 12],
  ],
  BLUE: [
    [10, 1],
    [10, 3],
    [12, 1],
    [12, 3],
  ],
};

// Safe squares: ring positions 0, 13, 26, 39 (starts) + 8, 21, 34, 47 (midpoints)
const SAFE_KEYS = new Set([
  "6,1",
  "1,8",
  "8,13",
  "13,6", // start squares (0, 13, 26, 39)
  "2,6",
  "6,12",
  "12,8",
  "8,2", // midpoint squares (8, 21, 34, 47)
]);

// Pre-compute base slot lookup: "row,col" → color
const BASE_SLOT_COLOR: Record<string, string> = {};
for (const [color, slots] of Object.entries(BASE_SLOTS)) {
  for (const [r, c] of slots) {
    BASE_SLOT_COLOR[`${r},${c}`] = color;
  }
}

// ── Cell background classification ───────────────────────────────────────────

function cellBg(row: number, col: number, key: string): string {
  // Corners (home bases)
  if (row <= 5 && col <= 5) return "bg-red-200";
  if (row <= 5 && col >= 9) return "bg-green-200";
  if (row >= 9 && col >= 9) return "bg-yellow-200";
  if (row >= 9 && col <= 5) return "bg-blue-200";

  // Center 3×3 (rows 6-8, cols 6-8) — petals + finish
  if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
    if (row === 6 && col === 6) return "bg-red-400";
    if (row === 6 && col === 8) return "bg-green-400";
    if (row === 8 && col === 6) return "bg-blue-400";
    if (row === 8 && col === 8) return "bg-yellow-400";
    if (row === 7 && col === 6) return "bg-red-300";
    if (row === 6 && col === 7) return "bg-green-300";
    if (row === 7 && col === 8) return "bg-yellow-300";
    if (row === 8 && col === 7) return "bg-blue-300";
    return "bg-white"; // (7,7) finish
  }

  // Home column stretches (middle row/col of each arm, excluding center cells)
  if (row === 7 && col >= 1 && col <= 5) return "bg-red-100";
  if (col === 7 && row >= 1 && row <= 5) return "bg-green-100";
  if (row === 7 && col >= 9 && col <= 13) return "bg-yellow-100";
  if (col === 7 && row >= 9 && row <= 13) return "bg-blue-100";

  // Safe squares get a faint color tint
  if (SAFE_KEYS.has(key)) return "bg-slate-100";

  // Regular track
  return "bg-white";
}

// ── Token color helpers ───────────────────────────────────────────────────────

function tokenHex(color: string): string {
  switch (color) {
    case "RED":
      return "#ef4444";
    case "GREEN":
      return "#22c55e";
    case "YELLOW":
      return "#eab308";
    case "BLUE":
      return "#3b82f6";
    default:
      return "#888888";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TokenInfo {
  player: number;
  color: string;
  tokenIndex: number;
}

interface LudoBoardVisualProps {
  board: LudoBoardData;
  userPlayer: number | null;
  size?: "sm" | "lg";
  legalMoves?: number[];
  onMove?: (tokenIndex: number) => void;
  disabled?: boolean;
  passButton?: React.ReactNode;
}

export default function LudoBoardVisual({
  board,
  userPlayer,
  size = "sm",
  legalMoves,
  onMove,
  disabled,
  passButton,
}: LudoBoardVisualProps) {
  // Build a "row,col" → TokenInfo[] map for rendering tokens on the grid
  const tokenMap = useMemo(() => {
    const map = new Map<string, TokenInfo[]>();
    board.tokens.forEach((playerTokens, pi) => {
      const player = pi + 1;
      const color = board.colors?.[String(player)] ?? "";
      playerTokens.forEach((pos, ti) => {
        let cell: [number, number] | undefined;
        if (pos.zone === "BASE") {
          cell = BASE_SLOTS[color]?.[ti];
        } else if (pos.zone === "RING") {
          cell = RING[pos.index];
        } else if (pos.zone === "HOME_COLUMN") {
          cell = HOME_COL[color]?.[pos.index];
        }
        if (cell) {
          const key = `${cell[0]},${cell[1]}`;
          const list = map.get(key) ?? [];
          list.push({ player, color, tokenIndex: ti });
          map.set(key, list);
        }
      });
    });
    return map;
  }, [board]);

  const legalSet = useMemo(() => new Set(legalMoves ?? []), [legalMoves]);
  const boardPx = size === "lg" ? 540 : 260;

  const [displayDice, setDisplayDice] = useState(board.dice);
  const [rolling, setRolling] = useState(false);
  const rollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (rollTimerRef.current) clearInterval(rollTimerRef.current);
    setRolling(true);
    let count = 0;
    rollTimerRef.current = setInterval(() => {
      count++;
      if (count >= 12) {
        clearInterval(rollTimerRef.current!);
        setDisplayDice(board.dice);
        setRolling(false);
      } else {
        setDisplayDice(Math.floor(Math.random() * 6) + 1);
      }
    }, 60);
    return () => {
      if (rollTimerRef.current) clearInterval(rollTimerRef.current);
    };
  }, [board.dice]);

  return (
    <div
      className={`space-y-2 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      style={{ width: boardPx }}
    >
      <div className="flex items-center gap-3">
        <div
          className={`text-4xl select-none transition-transform ${rolling ? "animate-bounce" : ""}`}
        >
          {DICE_FACES[displayDice - 1]}
        </div>
        {passButton}
      </div>

      <div
        className="aspect-square border border-border rounded overflow-hidden"
        style={{ width: boardPx }}
      >
        <div
          className="w-full h-full"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(15, 1fr)",
            gridTemplateRows: "repeat(15, 1fr)",
          }}
        >
          {Array.from({ length: 225 }, (_, i) => {
            const row = Math.floor(i / 15);
            const col = i % 15;
            const key = `${row},${col}`;
            const tokens = tokenMap.get(key) ?? [];
            const bg = cellBg(row, col, key);
            const isBaseSlot = key in BASE_SLOT_COLOR;
            const isCenter = row === 7 && col === 7;
            const isSafe = SAFE_KEYS.has(key);

            return (
              <div
                key={i}
                className={`relative ${bg}`}
                style={{ outline: "0.5px solid rgba(0,0,0,0.07)" }}
              >
                {/* Center finish star */}
                {isCenter && (
                  <div
                    className="absolute inset-0 flex items-center justify-center select-none"
                    style={{ fontSize: "55%" }}
                  >
                    ⭐
                  </div>
                )}

                {/* Safe square marker (only when no token) */}
                {isSafe && tokens.length === 0 && (
                  <div
                    className="absolute inset-0 flex items-center justify-center select-none opacity-40"
                    style={{ fontSize: "50%" }}
                  >
                    ✦
                  </div>
                )}

                {/* Empty base slot circle */}
                {isBaseSlot && tokens.length === 0 && (
                  <div className="absolute inset-[18%] rounded-full border border-white/70 bg-white/25" />
                )}

                {/* Single token */}
                {tokens.length === 1 &&
                  (() => {
                    const t = tokens[0];
                    const isClickable =
                      !disabled &&
                      onMove &&
                      t.player === userPlayer &&
                      legalSet.has(t.tokenIndex);
                    return (
                      <div
                        onClick={() => isClickable && onMove!(t.tokenIndex)}
                        className={[
                          "absolute inset-[12%] rounded-full shadow-sm",
                          isClickable
                            ? "cursor-pointer ring-2 ring-white animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_infinite]"
                            : "",
                        ].join(" ")}
                        style={{ backgroundColor: tokenHex(t.color) }}
                      />
                    );
                  })()}

                {/* Multiple tokens on same cell — 2×2 grid */}
                {tokens.length > 1 &&
                  tokens.slice(0, 4).map((t, idx) => {
                    const positions = [
                      { left: "8%", top: "8%" },
                      { left: "50%", top: "8%" },
                      { left: "8%", top: "50%" },
                      { left: "50%", top: "50%" },
                    ];
                    const p = positions[idx];
                    const isClickable =
                      !disabled &&
                      onMove &&
                      t.player === userPlayer &&
                      legalSet.has(t.tokenIndex);
                    return (
                      <div
                        key={idx}
                        onClick={() => isClickable && onMove!(t.tokenIndex)}
                        className={
                          isClickable
                            ? "absolute rounded-full shadow-sm cursor-pointer ring-1 ring-white animate-[ping_0.5s_cubic-bezier(0,0,0.2,1)_infinite]"
                            : "absolute rounded-full shadow-sm"
                        }
                        style={{
                          backgroundColor: tokenHex(t.color),
                          width: "42%",
                          height: "42%",
                          left: p.left,
                          top: p.top,
                        }}
                      />
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Player legend */}
      <div className="flex gap-3 flex-wrap">
        {board.tokens.map((_, pi) => {
          const player = pi + 1;
          const color = board.colors?.[String(player)] ?? "";
          const isYou = userPlayer === player;
          return (
            <div key={pi} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: tokenHex(color) }}
              />
              <span className="text-muted-foreground">
                {color} — {isYou ? "You" : "Opp"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
