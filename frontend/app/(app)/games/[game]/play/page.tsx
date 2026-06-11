"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createManualGame, getManualGame, submitManualMove } from "@/lib/api";
import type { ManualGameDetail, BoardData } from "@/lib/api";
import type { LudoBoardData } from "@/components/LudoBoard";
import Board from "@/components/Board";
import LudoBoardVisual from "@/components/LudoBoardVisual";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GAME_LABELS: Record<string, string> = {
  tictactoe: "Tic-Tac-Toe",
  ludo: "Ludo",
};

function resultMessage(game: ManualGameDetail): string {
  const r = game.result;
  if (!r) return "";
  if (r.is_draw) return "Draw!";
  if (r.winner_player === game.human_player) return "You win!";
  return "You lose.";
}

function statusMessage(game: ManualGameDetail): string {
  if (game.status === "pending") return "Starting…";
  if (game.status === "completed" || game.status === "failed") return "";
  if (game.current_legal_moves !== null) return "Your turn";
  return "Opponent thinking…";
}

const LUDO_COLOR_CLASS: Record<string, string> = {
  RED: "text-red-500",
  GREEN: "text-green-600",
  YELLOW: "text-yellow-500",
  BLUE: "text-blue-500",
};

interface LogEntry {
  key: number;
  turn: number;
  color: string;
  isHuman: boolean;
  action: string;
}

function moveAction(
  move: { player: number | null; move: unknown; board: unknown },
  prevBoard: LudoBoardData | null,
  isHuman: boolean,
  humanIdx: number,
): string {
  const after = move.board as LudoBoardData;
  const dice = after.dice;

  if (move.move === "NO_MOVE") return `rolled ${dice} — no valid moves`;

  if (prevBoard) {
    if (!isHuman) {
      const captured = prevBoard.tokens?.[humanIdx]?.some((before, ti) => {
        const aft = after.tokens?.[humanIdx]?.[ti];
        return before.zone !== "BASE" && aft?.zone === "BASE";
      });
      if (captured) return `rolled ${dice} — captured your piece!`;
    } else {
      let captured = false;
      for (let p = 0; p < after.tokens.length; p++) {
        if (p === humanIdx) continue;
        captured =
          prevBoard.tokens?.[p]?.some((before, ti) => {
            const aft = after.tokens?.[p]?.[ti];
            return before.zone !== "BASE" && aft?.zone === "BASE";
          }) ?? false;
        if (captured) break;
      }
      if (captured) return `rolled ${dice} — captured opponent's piece!`;
    }

    const playerIdx = move.player! - 1;
    const madeHome = after.tokens?.[playerIdx]?.some((aft, ti) => {
      const before = prevBoard.tokens?.[playerIdx]?.[ti];
      return (
        aft.zone === "HOME_COLUMN" &&
        aft.index === 5 &&
        !(before?.zone === "HOME_COLUMN" && before?.index === 5)
      );
    });
    if (madeHome) return `rolled ${dice} — got a piece home!`;
  }

  return `rolled ${(move.board as LudoBoardData).dice} — moved a piece`;
}

function buildMoveLog(game: ManualGameDetail): LogEntry[] {
  const { moves, human_player: hp } = game;
  const humanIdx = (hp ?? 1) - 1;
  return moves
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.player !== null)
    .reverse()
    .map(({ m, i }) => {
      const board = m.board as LudoBoardData;
      const color = board.colors?.[String(m.player)] ?? "";
      const prevBoard = i > 0 ? (moves[i - 1].board as LudoBoardData) : null;
      return {
        key: i,
        turn: m.turn,
        color,
        isHuman: m.player === hp,
        action: moveAction(m, prevBoard, m.player === hp, humanIdx),
      };
    });
}

export default function PlayPage() {
  const params = useParams();
  const gameId = params.game as string;
  const gameLabel = GAME_LABELS[gameId] ?? gameId;

  const [opponent, setOpponent] = useState("easy");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<ManualGameDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startError, setStartError] = useState("");
  const [lastMove, setLastMove] = useState<{ player: number; tokenIndex: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Playback: step through opponent moves one-by-one with delays
  const [displayBoard, setDisplayBoard] = useState<BoardData | null>(null);
  const [playingBack, setPlayingBack] = useState(false);
  const lastAnimatedTurnRef = useRef(-1);
  const playbackActiveRef = useRef(false);
  const playbackTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!gameState) {
      setDisplayBoard(null);
      return;
    }

    if (gameState.status === "completed" || gameState.status === "failed") {
      playbackTimersRef.current.forEach(clearTimeout);
      playbackTimersRef.current = [];
      playbackActiveRef.current = false;
      setPlayingBack(false);
      setDisplayBoard(gameState.current_board);
      return;
    }

    if (playbackActiveRef.current) return;

    const hp = gameState.human_player;
    const newOppMoves = gameState.moves.filter(
      (m) =>
        m.player !== null &&
        m.player !== hp &&
        m.turn > lastAnimatedTurnRef.current,
    );

    if (newOppMoves.length === 0) {
      setDisplayBoard(gameState.current_board);
      return;
    }

    // Show the board as it was before the opponent started moving
    const firstOppIdx = gameState.moves.findIndex(
      (m) => m.turn === newOppMoves[0].turn,
    );
    if (firstOppIdx > 0)
      setDisplayBoard(gameState.moves[firstOppIdx - 1].board as BoardData);

    playbackActiveRef.current = true;
    setPlayingBack(true);

    const timers: ReturnType<typeof setTimeout>[] = [];
    let delay = 500;

    newOppMoves.forEach((move) => {
      timers.push(
        setTimeout(() => {
          setDisplayBoard(move.board as BoardData);
          if (move.player !== null && typeof move.move === "number") {
            setLastMove({ player: move.player, tokenIndex: move.move });
          }
        }, delay),
      );
      delay += 900;
    });

    // Show human's board (their dice has been rolled) after all opponent moves
    timers.push(
      setTimeout(() => setDisplayBoard(gameState.current_board), delay),
    );

    // Unlock interaction after the human's dice animation settles (~720 ms)
    timers.push(
      setTimeout(() => {
        setPlayingBack(false);
        playbackActiveRef.current = false;
        lastAnimatedTurnRef.current = Math.max(
          ...newOppMoves.map((m) => m.turn),
        );
        playbackTimersRef.current = [];
      }, delay + 750),
    );

    playbackTimersRef.current = timers;
  }, [gameState]);

  // Adaptive polling loop
  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;

    async function poll() {
      try {
        const data = await getManualGame(matchId!);
        if (cancelled) return;
        setGameState(data);
        if (data.status !== "completed" && data.status !== "failed") {
          // Poll faster when waiting for the bot, slower when waiting on the human
          const delay = data.current_legal_moves !== null ? 3000 : 1000;
          pollRef.current = setTimeout(poll, delay);
        }
      } catch {
        if (!cancelled) pollRef.current = setTimeout(poll, 2000);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [matchId]);

  async function handleStart() {
    setStartError("");
    try {
      const { match_id } = await createManualGame(gameId, opponent);
      setMatchId(match_id);
    } catch (e: unknown) {
      setStartError(e instanceof Error ? e.message : "Failed to start game");
    }
  }

  async function handleMove(move: number[] | number | string) {
    if (submitting || !matchId) return;
    if (gameState && typeof move === "number") {
      setLastMove({ player: gameState.human_player!, tokenIndex: move });
    }
    setSubmitting(true);
    // Optimistically clear legal moves so the board goes into "thinking" state
    setGameState((prev) =>
      prev ? { ...prev, current_legal_moves: null } : prev,
    );
    try {
      await submitManualMove(matchId, move);
      // Poll immediately after submitting to pick up the bot's response quickly
      if (pollRef.current) clearTimeout(pollRef.current);
      const data = await getManualGame(matchId);
      setGameState(data);
      if (data.status !== "completed" && data.status !== "failed") {
        pollRef.current = setTimeout(async function repoll() {
          try {
            const d = await getManualGame(matchId!);
            setGameState(d);
            if (d.status !== "completed" && d.status !== "failed") {
              const delay = d.current_legal_moves !== null ? 3000 : 1000;
              pollRef.current = setTimeout(repoll, delay);
            }
          } catch {
            pollRef.current = setTimeout(repoll, 2000);
          }
        }, 1000);
      }
    } catch {
      // Move rejected — restore legal moves by re-polling
      try {
        const data = await getManualGame(matchId);
        setGameState(data);
      } catch {
        /* ignore */
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    playbackTimersRef.current.forEach(clearTimeout);
    playbackTimersRef.current = [];
    playbackActiveRef.current = false;
    lastAnimatedTurnRef.current = -1;
    setDisplayBoard(null);
    setPlayingBack(false);
    setMatchId(null);
    setGameState(null);
    setSubmitting(false);
    setLastMove(null);
  }

  const isMyTurn =
    gameState?.current_legal_moves !== null && gameState?.status === "running";
  const isFinished =
    gameState?.status === "completed" || gameState?.status === "failed";

  // Derived synchronously so that the single render between setGameState and
  // the playback useEffect doesn't briefly expose legal moves (causing a flash
  // of pulsing pieces or "You rolled..." while opponent moves are still pending).
  const hasUnplayedOppMoves =
    gameState != null &&
    gameState.moves.some(
      (m) =>
        m.player !== null &&
        m.player !== gameState.human_player &&
        m.turn > lastAnimatedTurnRef.current,
    );
  const effectivePlayingBack = playingBack || hasUnplayedOppMoves;

  // ── Start screen ──────────────────────────────────────────────────────────
  if (!matchId) {
    return (
      <div className="p-6 max-w-lg mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Play {gameLabel}</h1>
          <p className="text-sm text-muted-foreground">
            Play manually against a bot. The referee sees you the same as any
            other bot.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium">Opponent difficulty</label>
          <Select value={opponent} onValueChange={(v) => v && setOpponent(v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {startError && <p className="text-sm text-destructive">{startError}</p>}

        <Button onClick={handleStart} className="w-fit">
          Start Game
        </Button>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!gameState) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <p className="text-muted-foreground text-sm">Starting game…</p>
      </div>
    );
  }

  const legalMoves =
    isMyTurn && !submitting && !effectivePlayingBack
      ? (gameState.current_legal_moves ?? [])
      : [];
  const boardDisabled = !isMyTurn || submitting || effectivePlayingBack;

  const effectiveBoard = displayBoard ?? gameState.current_board;
  const ludoBoard =
    gameId === "ludo" && effectiveBoard
      ? (effectiveBoard as LudoBoardData)
      : null;
  const moveLog = gameId === "ludo" ? buildMoveLog(gameState) : [];

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{gameLabel}</h1>
          <p className="text-xs text-muted-foreground">
            vs {gameState.opponent} · You are Player {gameState.human_player}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          New Game
        </Button>
      </div>

      {/* Status bar */}
      {!isFinished && (
        <div className="text-sm font-medium">
          {effectivePlayingBack ? "Opponent is moving…" : statusMessage(gameState)}
        </div>
      )}

      {/* Result banner */}
      {isFinished && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            gameState.result?.is_draw
              ? "bg-muted text-muted-foreground"
              : gameState.result?.winner_player === gameState.human_player
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : "bg-destructive/10 text-destructive"
          }`}
        >
          {resultMessage(gameState)}
          {gameState.result && (
            <span className="ml-2 font-normal opacity-70">
              ({gameState.result.reason}, {gameState.result.turn} turns)
            </span>
          )}
          {gameState.error && (
            <span className="ml-2 font-normal opacity-70">
              {gameState.error}
            </span>
          )}
        </div>
      )}

      {/* Board */}
      {effectiveBoard && (
        <div
          className={
            gameId === "ludo" ? "flex gap-6 items-start" : "flex justify-center"
          }
        >
          {gameId === "ludo" ? (
            <>
              {/* Board */}
              <div className="flex-shrink-0">
                <LudoBoardVisual
                  board={ludoBoard!}
                  userPlayer={gameState.human_player}
                  size="lg"
                  legalMoves={legalMoves as number[]}
                  onMove={(ti) => handleMove(ti)}
                  disabled={boardDisabled}
                  lastMove={lastMove}
                  passButton={
                    isMyTurn && !submitting && legalMoves.length === 0 ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleMove("NO_MOVE")}
                      >
                        Pass Turn
                      </Button>
                    ) : undefined
                  }
                />
              </div>

              {/* Move log */}
              <div
                className="flex flex-col flex-1 min-w-0 border rounded-lg overflow-hidden"
                style={{ height: 540 }}
              >
                {/* Pinned prompt */}
                <div className="px-3 py-2 border-b bg-muted/40 flex-shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                    Move Log
                  </p>
                  {!isFinished && (
                    <p className="text-sm font-medium">
                      {isMyTurn && !effectivePlayingBack
                        ? legalMoves.length > 0
                          ? `You rolled ${ludoBoard!.dice} — click a highlighted piece`
                          : `You rolled ${ludoBoard!.dice} — press Pass Turn`
                        : "Opponent thinking…"}
                    </p>
                  )}
                </div>

                {/* Scrollable history */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {moveLog.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center mt-6">
                      No moves yet
                    </p>
                  )}
                  {moveLog.map((entry) => (
                    <div
                      key={entry.key}
                      className="text-xs px-1 py-0.5 leading-snug flex gap-2"
                    >
                      <span className="text-muted-foreground w-6 flex-shrink-0 text-right">
                        #{entry.turn}
                      </span>
                      <span>
                        <span
                          className={`font-semibold ${LUDO_COLOR_CLASS[entry.color] ?? ""}`}
                        >
                          {entry.color}
                          {entry.isHuman ? " (You)" : ""}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {entry.action}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Board
              board={effectiveBoard as number[][]}
              legalMoves={legalMoves as number[][]}
              onMove={(m) => handleMove(m)}
              disabled={boardDisabled}
            />
          )}
        </div>
      )}

      {/* Waiting for first move (human is player 2, board not yet populated) */}
      {!effectiveBoard && !isFinished && (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground text-sm">
            Waiting for opponent to move first…
          </p>
        </div>
      )}
    </div>
  );
}
