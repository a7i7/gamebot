const GAME_INFO: Record<string, { name: string; emoji: string; description: string; protocol: string }> = {
  tictactoe: {
    name: "Tic-Tac-Toe",
    emoji: "🎯",
    description:
      "Classic 3×3 grid game. You are Player 1 (X). Your bot plays against a random opponent (O). First to get three in a row — horizontally, vertically, or diagonally — wins.",
    protocol: `Your bot receives JSON on stdin and must write JSON to stdout.

INIT message (once at start):
{
  "type": "INIT",
  "player": 1,
  "game": "tictactoe",
  "config": { "board_size": 3 }
}

MOVE message (each turn):
{
  "type": "MOVE",
  "turn": 1,
  "board": [[0,0,0],[0,0,0],[0,0,0]],
  "last_move": null,
  "legal_moves": [[0,0],[0,1],...]
}

Your response (to MOVE):
{ "move": [row, col] }

Board values: 0=empty, 1=you (X), 2=opponent (O)
Rows and columns are 0-indexed.
You have 1 second per move.`,
  },
};

interface GameInfoPanelProps {
  game: string;
}

export function GameInfoPanel({ game }: GameInfoPanelProps) {
  const info = GAME_INFO[game];

  if (!info) {
    return (
      <div className="p-4 text-muted-foreground text-sm">
        No information available for this game.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 overflow-auto h-full">
      <div>
        <div className="text-3xl mb-2">{info.emoji}</div>
        <h2 className="text-xl font-bold text-foreground">{info.name}</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{info.description}</p>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Bot Protocol
        </h3>
        <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto font-mono whitespace-pre-wrap leading-relaxed text-foreground">
          {info.protocol}
        </pre>
      </div>
    </div>
  );
}
