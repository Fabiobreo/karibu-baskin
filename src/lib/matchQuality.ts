// ── Match Quality Score ───────────────────────────────────────────────────────
//
// Stima la difficoltà di una partita futura confrontando la forza TrueSkill
// della nostra squadra (Σμ dei convocati) con la stima per-giocatore
// dell'avversario (OpposingTeam.ratingMu). Approssimazione logistica della
// funzione di distribuzione normale standard (nessuna dipendenza esterna).

import { TRUESKILL } from "./trueskill";

/** Approssimazione logistica di Φ(x) — errore < 0.003 nell'intero dominio. */
function normcdf(x: number): number {
  return 1 / (1 + Math.exp(-1.7 * x));
}

export type QualityLabel = "Favoriti" | "Equilibrata" | "Sfavoriti";

export interface MatchQuality {
  /** Probabilità di vittoria stimata [0, 1]. */
  winProbability: number;
  /** Etichetta leggibile basata sulla probabilità. */
  label: QualityLabel;
  /** Differenza di skill normalizzata (positivo = siamo più forti). */
  skillGap: number;
}

/**
 * Stima la qualità di un match dato:
 * @param ourPlayerMus  μ dei giocatori convocati/della squadra (array, può essere vuoto)
 * @param opponentMuPerPlayer  μ medio per giocatore dell'avversario (null = sconosciuto)
 *
 * Se non abbiamo dati sufficienti (nessun convocato o avversario sconosciuto)
 * restituisce `null`: il componente UI deve gestire il caso "dati insufficienti".
 */
export function computeMatchQuality(
  ourPlayerMus: number[],
  opponentMuPerPlayer: number | null
): MatchQuality | null {
  if (ourPlayerMus.length === 0 || opponentMuPerPlayer === null) return null;

  const N = ourPlayerMus.length;
  const ourTotal = ourPlayerMus.reduce((s, m) => s + m, 0);
  const oppTotal = opponentMuPerPlayer * N;

  // Varianza combinata delle performance di entrambe le squadre:
  // V = N*(β² + σ₀²) + N*(β² + σ₀²) = 2N*(β² + σ₀²)
  const varPerPlayer = TRUESKILL.BETA ** 2 + TRUESKILL.SIGMA ** 2;
  const combinedSigma = Math.sqrt(2 * N * varPerPlayer);

  const delta = ourTotal - oppTotal;
  const winProbability = normcdf(delta / combinedSigma);
  const skillGap = delta / (TRUESKILL.MU * N); // gap normalizzato per team size

  let label: QualityLabel;
  if (winProbability >= 0.6) label = "Favoriti";
  else if (winProbability <= 0.4) label = "Sfavoriti";
  else label = "Equilibrata";

  return { winProbability, label, skillGap };
}

/**
 * Etichette leggibili per la forza stimata avversaria (usate nella UI).
 * Queste soglie corrispondono a: WEAK = ~70% del default, STRONG = ~130%.
 */
export const OPPONENT_MU_PRESETS: Record<string, number> = {
  WEAK: TRUESKILL.MU * 0.7, // ~17.5
  MEDIUM: TRUESKILL.MU, // 25
  STRONG: TRUESKILL.MU * 1.3, // ~32.5
};
