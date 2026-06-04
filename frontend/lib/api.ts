import { getToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Lang = "python" | "javascript" | "java" | "cpp";
export type MatchStatus = "pending" | "running" | "completed" | "failed";

// --- Test Run types ---

export interface TestRunSummary {
  match_id: string;
  status: MatchStatus;
  game: string;
  lang: Lang;
  opponent: string | null;
  submitted_at: string;
}

// Tic-Tac-Toe: number[][] grid. Ludo: { tokens, dice, colors }. Game-specific.
export type LudoPosition = { zone: "BASE" | "RING" | "HOME_COLUMN"; index: number };
export type BoardData =
  | number[][]
  | { tokens: LudoPosition[][]; dice: number; colors: Record<string, string> };

export interface MoveRecord {
  turn: number;
  player: number | null;
  move: number[] | number | string | null;
  board: BoardData;
}

export interface MatchResult {
  winner_player: number | null;
  loser_player: number | null;
  user_player: number | null;
  is_draw: boolean;
  reason: string;
  turn: number;
  board: BoardData;
  bot_logs: string[];
  moves: MoveRecord[];
}

export interface TestRunDetail extends TestRunSummary {
  result: MatchResult | null;
  error: string | null;
}

export interface CodeResponse {
  match_id: string;
  lang: Lang;
  code: string;
}

// --- Leaderboard types ---

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  wins: number;
  draws: number;
  losses: number;
}

// --- Scored Submission types ---

export interface SubmissionSummary {
  submission_id: string;
  status: MatchStatus;
  game: string;
  lang: Lang;
  score: number | null;
  matches_completed: number;
  total_matches: number;
  created_at: string;
}

export interface SubmissionMatchDetail {
  match_id: string;
  opponent: string | null;
  status: MatchStatus;
  winner_player: number | null;
  is_draw: boolean | null;
  reason: string | null;
  points_earned: number | null;
}

export interface SubmissionDetail extends SubmissionSummary {
  wins: number;
  draws: number;
  losses: number;
  matches: SubmissionMatchDetail[];
  completed_at: string | null;
}

// --- Helpers ---

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// --- Auth ---

// Extracts a human-readable message from a FastAPI error response (422 or plain detail).
async function extractErrorMessage(res: Response): Promise<string> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return await res.text();
  }
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    // FastAPI 422 validation errors: { detail: [{ msg, loc }] }
    if (Array.isArray(b.detail)) {
      return (b.detail as Array<{ msg: string }>)
        .map((e) => e.msg.replace(/^Value error, /, ""))
        .join("; ");
    }
    if (typeof b.detail === "string") return b.detail;
  }
  return "Request failed";
}

export async function signup(
  email: string,
  username: string,
  password: string
): Promise<{ access_token: string }> {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  if (!res.ok) throw new Error(`${res.status}:${await extractErrorMessage(res)}`);
  return res.json();
}

export async function login(
  identifier: string,
  password: string
): Promise<{ access_token: string }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) throw new Error(`${res.status}:${await extractErrorMessage(res)}`);
  return res.json();
}

// --- Test Runs ---

export async function submitTestRun(
  game: string,
  lang: Lang,
  code: string,
  opponent: string = "easy"
): Promise<{ match_id: string }> {
  const res = await fetch(`${API_URL}/test-runs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ game, lang, code, opponent }),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res));
  return res.json();
}

export async function listTestRuns(): Promise<TestRunSummary[]> {
  const res = await fetch(`${API_URL}/test-runs`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getTestRun(matchId: string): Promise<TestRunDetail> {
  const res = await fetch(`${API_URL}/test-runs/${matchId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getTestRunCode(matchId: string): Promise<CodeResponse> {
  const res = await fetch(`${API_URL}/test-runs/${matchId}/code`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// --- Scored Submissions ---

export async function createSubmission(
  game: string,
  lang: Lang,
  code: string
): Promise<{ submission_id: string }> {
  const res = await fetch(`${API_URL}/submissions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ game, lang, code }),
  });
  if (!res.ok) throw new Error(await extractErrorMessage(res));
  return res.json();
}

export async function listSubmissions(): Promise<SubmissionSummary[]> {
  const res = await fetch(`${API_URL}/submissions`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSubmission(
  submissionId: string
): Promise<SubmissionDetail> {
  const res = await fetch(`${API_URL}/submissions/${submissionId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getLeaderboard(game: string): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_URL}/leaderboards/${game}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
