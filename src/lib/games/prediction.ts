import type { MatchResult } from "@prisma/client";
import { hasStarted } from "@/lib/matches/matchPhase";

/**
 * Regole del pronostico della partita (UX-61), pure e testate.
 *
 * Si pronostica solo chi vince (e, se si vuole, il punteggio), nelle partite
 * di una nostra squadra contro un'avversaria, da 3 giorni prima all'orario
 * d'inizio. I risultati si mostrano solo come numeri: mai i nomi di chi ha
 * pronosticato (decisione del committente, 12/11/2026), mai una classifica.
 */

export const PREDICTION_OPENS_BEFORE_MS = 3 * 24 * 60 * 60 * 1000;

export type PredictionOutcome = MatchResult;

/** Ordine dei bottoni: noi, pareggio, loro. */
export const PREDICTION_OUTCOMES = [
  "WIN",
  "DRAW",
  "LOSS",
] as const satisfies readonly MatchResult[];

interface PredictableMatch {
  date: Date | string;
  opponentId: string | null;
  opponentTeamId: string | null;
}

/**
 * - `none`: la partita non ha il pronostico (amichevole interna fra due
 *   squadre nostre);
 * - `notYet`: apre 3 giorni prima;
 * - `open`: si può fare e cambiare;
 * - `closed`: la partita è iniziata.
 */
export type PredictionWindow = "none" | "notYet" | "open" | "closed";

export function hasPrediction(match: Omit<PredictableMatch, "date">): boolean {
  return !!match.opponentId && !match.opponentTeamId;
}

export function predictionOpensAt(date: Date | string): Date {
  return new Date(new Date(date).getTime() - PREDICTION_OPENS_BEFORE_MS);
}

export function predictionWindow(match: PredictableMatch, now: number): PredictionWindow {
  if (!hasPrediction(match)) return "none";
  if (hasStarted(match.date, now)) return "closed";
  return now >= predictionOpensAt(match.date).getTime() ? "open" : "notYet";
}

interface MatchScore {
  ourScore: number | null;
  theirScore: number | null;
  result?: MatchResult | null;
}

/** Esito di una partita dal punteggio (o da `result` quando c'è solo quello). */
export function matchOutcome(match: MatchScore): PredictionOutcome | null {
  if (match.ourScore !== null && match.theirScore !== null) {
    if (match.ourScore > match.theirScore) return "WIN";
    if (match.ourScore < match.theirScore) return "LOSS";
    return "DRAW";
  }
  return match.result ?? null;
}

export interface PredictionRow {
  outcome: PredictionOutcome;
  ourScore: number | null;
  theirScore: number | null;
}

export interface PredictionVerdict {
  /** Ha indovinato chi vince. */
  right: boolean;
  /** Se ha messo il punteggio: `exact` se è proprio quello, `gap` i punti di differenza in tutto. */
  score: { exact: boolean; gap: number } | null;
}

/** Com'è andato un pronostico, a partita giocata; `null` senza risultato. */
export function predictionVerdict(
  prediction: PredictionRow,
  match: MatchScore
): PredictionVerdict | null {
  const actual = matchOutcome(match);
  if (!actual) return null;
  let score: PredictionVerdict["score"] = null;
  if (
    prediction.ourScore !== null &&
    prediction.theirScore !== null &&
    match.ourScore !== null &&
    match.theirScore !== null
  ) {
    const gap =
      Math.abs(prediction.ourScore - match.ourScore) +
      Math.abs(prediction.theirScore - match.theirScore);
    score = { exact: gap === 0, gap };
  }
  return { right: prediction.outcome === actual, score };
}

export interface PredictionTotals {
  total: number;
  WIN: number;
  DRAW: number;
  LOSS: number;
}

/** Totali per risultato: solo numeri, nessun nome. */
export function predictionTotals(
  rows: readonly { outcome: PredictionOutcome }[]
): PredictionTotals {
  const totals: PredictionTotals = { total: rows.length, WIN: 0, DRAW: 0, LOSS: 0 };
  for (const r of rows) totals[r.outcome] += 1;
  return totals;
}

/** "Pronostici giusti: 7 su 10", contando solo le partite che hanno un risultato. */
export function predictionRecord(rows: readonly (PredictionRow & { match: MatchScore })[]): {
  right: number;
  total: number;
} {
  let right = 0;
  let total = 0;
  for (const row of rows) {
    const verdict = predictionVerdict(row, row.match);
    if (!verdict) continue;
    total += 1;
    if (verdict.right) right += 1;
  }
  return { right, total };
}
