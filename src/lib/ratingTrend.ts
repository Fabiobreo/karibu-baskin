// ── Classificazione andamento rating (Player Development Tracker) ────────────
//
// A partire dalla serie cronologica di μ di un giocatore, classifica l'andamento
// in: crescita / calo / plateau / altalenante. Logica pura e testabile; le
// soglie sono euristiche tarabili. Usata dal Development Tracker (COACH/ADMIN).

export type TrendLabel = "crescita" | "calo" | "plateau" | "altalenante" | "nuovo";

export interface TrendResult {
  label: TrendLabel;
  /** Pendenza media per passo (variazione di μ attesa per partita). */
  slope: number;
  /** Variazione totale di μ stimata sull'intera serie (slope × passi). */
  totalTrend: number;
  /** Volatilità = deviazione standard delle variazioni consecutive di μ. */
  volatility: number;
}

/** Numero minimo di punti per dare un giudizio (sotto → "nuovo"). */
const MIN_POINTS = 4;
/** Variazione totale di μ oltre la quale si parla di crescita/calo. */
const TREND_THRESHOLD = 2.0;
/** Volatilità oltre la quale (in assenza di trend netto) è "altalenante". */
const VOLATILITY_THRESHOLD = 2.0;

/** Regressione lineare semplice: pendenza di y rispetto all'indice 0..n-1. */
function linearSlope(ys: number[]): number {
  const n = ys.length;
  const meanX = (n - 1) / 2;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (ys[i] - meanY);
    den += (i - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Classifica l'andamento di una serie cronologica di μ.
 * @param mus μ in ordine cronologico (dal più vecchio al più recente).
 */
export function classifyTrend(mus: number[]): TrendResult {
  if (mus.length < MIN_POINTS) {
    return { label: "nuovo", slope: 0, totalTrend: 0, volatility: 0 };
  }

  const slope = linearSlope(mus);
  const totalTrend = slope * (mus.length - 1);

  const deltas: number[] = [];
  for (let i = 1; i < mus.length; i++) deltas.push(mus[i] - mus[i - 1]);
  const volatility = stdDev(deltas);

  let label: TrendLabel;
  if (totalTrend > TREND_THRESHOLD) label = "crescita";
  else if (totalTrend < -TREND_THRESHOLD) label = "calo";
  else if (volatility > VOLATILITY_THRESHOLD) label = "altalenante";
  else label = "plateau";

  return { label, slope, totalTrend, volatility };
}

/** Etichetta leggibile + colore MUI per la UI. */
export const TREND_META: Record<
  TrendLabel,
  { label: string; color: "success" | "error" | "warning" | "default" | "info" }
> = {
  crescita: { label: "In crescita", color: "success" },
  calo: { label: "In calo", color: "error" },
  plateau: { label: "Stabile", color: "default" },
  altalenante: { label: "Altalenante", color: "warning" },
  nuovo: { label: "Pochi dati", color: "info" },
};
