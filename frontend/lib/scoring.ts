// Per-game ranked-submission display config. Mirrors the backend
// SUBMISSION_CONFIG in db/repos/scored_submissions.py — keep in sync.
//
// gameMaxScore is the top of each game's score scale: Tic-Tac-Toe scores are
// normalized to 0-100 on the backend, while Ludo uses an absolute 0-400 sum.

const GAME_MAX_SCORE: Record<string, number> = {
  ludo: 400,
};
const DEFAULT_MAX_SCORE = 100;

const GAME_TOTAL_MATCHES: Record<string, number> = {
  ludo: 6,
};
const DEFAULT_TOTAL_MATCHES = 15;

export function gameMaxScore(game: string): number {
  return GAME_MAX_SCORE[game] ?? DEFAULT_MAX_SCORE;
}

export function totalMatchesForGame(game: string): number {
  return GAME_TOTAL_MATCHES[game] ?? DEFAULT_TOTAL_MATCHES;
}

// Color a score by its fraction of that game's max, so the same thresholds work
// across games on different scales (e.g. TTT 0-100 vs Ludo 0-400).
export function scoreColor(score: number, game: string): string {
  const p = score / gameMaxScore(game);
  if (p >= 0.8) return "text-green-500";
  if (p >= 0.5) return "text-yellow-500";
  return "text-destructive";
}
