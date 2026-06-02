import { getToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Lang = "python" | "javascript" | "java" | "cpp";
export type MatchStatus = "pending" | "running" | "completed" | "failed";

export interface MatchSummary {
  match_id: string;
  status: MatchStatus;
  game: string;
  lang: Lang;
  submitted_at: string;
}

export interface MatchResult {
  winner_player: number | null;
  loser_player: number | null;
  is_draw: boolean;
  reason: string;
  turn: number;
  board: number[][];
  bot_logs: string[];
}

export interface MatchDetail extends MatchSummary {
  result: MatchResult | null;
  error: string | null;
}

export interface CodeResponse {
  match_id: string;
  lang: Lang;
  code: string;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function signup(
  email: string,
  password: string
): Promise<{ access_token: string }> {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function login(
  email: string,
  password: string
): Promise<{ access_token: string }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function submitMatch(
  game: string,
  lang: Lang,
  code: string,
  opponent: string = "easy"
): Promise<{ match_id: string }> {
  const res = await fetch(`${API_URL}/matches`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ game, lang, code, opponent }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listMatches(): Promise<MatchSummary[]> {
  const res = await fetch(`${API_URL}/matches`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMatch(matchId: string): Promise<MatchDetail> {
  const res = await fetch(`${API_URL}/matches/${matchId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMatchCode(matchId: string): Promise<CodeResponse> {
  const res = await fetch(`${API_URL}/matches/${matchId}/code`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
