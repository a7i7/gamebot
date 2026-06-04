"use client";

// Minimal text board for Ludo: lists each player's token positions.
// A token position is { zone, index }:
//   BASE        index -1     in the yard
//   RING        index 0..51  shared/absolute ring square
//   HOME_COLUMN index 0..5   private column; index 5 = HOME (finished)

export interface LudoPosition {
  zone: "BASE" | "RING" | "HOME_COLUMN";
  index: number;
}

export interface LudoBoardData {
  tokens: LudoPosition[][]; // tokens[playerIndex][tokenIndex]
  dice: number;
  colors: Record<string, string>; // playerId -> color name
}

// Tailwind text color per Ludo color name (falls back to foreground).
const COLOR_CLASS: Record<string, string> = {
  RED: "text-red-500",
  GREEN: "text-green-500",
  YELLOW: "text-yellow-500",
  BLUE: "text-blue-500",
};

function describe(p: LudoPosition): string {
  if (p.zone === "BASE") return "base";
  if (p.zone === "RING") return `ring ${p.index}`;
  return p.index === 5 ? "HOME" : `home ${p.index}`;
}

interface LudoBoardProps {
  board: LudoBoardData;
  userPlayer: number | null;
}

export default function LudoBoard({ board, userPlayer }: LudoBoardProps) {
  return (
    <div className="font-mono text-sm space-y-3">
      <div className="text-xs text-muted-foreground">dice: {board.dice}</div>
      {board.tokens.map((toks, pi) => {
        const player = pi + 1;
        const isYou = userPlayer === player;
        const color = board.colors?.[String(player)] ?? "";
        return (
          <div key={pi}>
            <div className="font-semibold">
              <span className={COLOR_CLASS[color] ?? "text-foreground"}>
                Player {player} · {color || "?"}
              </span>{" "}
              <span className="text-muted-foreground font-normal">
                {isYou ? "(You)" : "(Opponent)"}
              </span>
            </div>
            <ul className="ml-3 mt-1 text-muted-foreground space-y-0.5">
              {toks.map((p, ti) => (
                <li key={ti}>
                  token {ti}: {describe(p)}{" "}
                  <span className="opacity-50">
                    [{p.zone}:{p.index}]
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
