import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const games = [
  {
    id: "tictactoe",
    name: "Tic-Tac-Toe",
    emoji: "🎯",
    description: "Classic 3×3 grid. First to get three in a row wins. Beat the random bot.",
    available: true,
  },
  {
    id: "ludo",
    name: "Ludo",
    emoji: "🎲",
    description: "2-player, 4 tokens each. The referee rolls the die — you pick which token to move. First to get all four tokens home wins.",
    available: true,
  },
  {
    id: "connect4",
    name: "Connect 4",
    emoji: "🔴",
    description: "Drop pieces into a 7×6 grid. Connect four in a line to win.",
    available: false,
  },
  {
    id: "chess",
    name: "Chess",
    emoji: "♟️",
    description: "The classic strategy game. Checkmate your opponent's king.",
    available: false,
  },
];

export default function GamesPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">Games</h1>
        <p className="text-muted-foreground">Pick a game and submit your bot to compete.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => (
          <Card key={game.id} className={`h-full ${game.available ? "" : "opacity-60"}`}>
            <CardHeader className="pb-3">
              <div className="text-4xl mb-2">{game.emoji}</div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{game.name}</CardTitle>
                {!game.available && (
                  <Badge variant="secondary" className="text-xs">Soon</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <p className="text-sm text-muted-foreground">{game.description}</p>
              <div className="mt-auto flex flex-col gap-2">
                {game.available ? (
                  <>
                    <Link href={`/games/${game.id}`} className="block">
                      <Button className="w-full" size="sm">
                        Submit Bot →
                      </Button>
                    </Link>
                    <Link href={`/games/${game.id}/play`} className="block">
                      <Button className="w-full" variant="outline" size="sm">
                        Play vs Bot
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Button className="w-full" size="sm" disabled>
                    Coming Soon
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
