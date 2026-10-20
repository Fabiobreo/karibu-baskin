// ── Andamento del livello stimato (Sviluppo giocatori) ───────────────────────
//
// Logica pura e testabile per il tracker dello staff (/admin/sviluppo).
// Due domande, tenute separate:
//   1. quanti dati ci sono (si legge la curva o è ancora in formazione?);
//   2. come sta andando adesso: il trend guarda solo le ultime partite, così
//      coincide con quello che l'occhio vede alla fine della curva. Una retta su
//      tutta la storia diceva "Stabile" a chi era sceso e poi risalito.

/** Punto della curva: livello stimato dopo un aggiornamento. */
export interface CurvePoint {
  mu: number;
  sigma: number;
  /** Partita che ha prodotto il punto; "other" = cambio ruolo o correzione. */
  kind: "training" | "official" | "other";
}

export type CurveStatus = "leggibile" | "formazione" | "senza";
export type TrendLabel = "salita" | "calo" | "stabile";

export interface RecentTrend {
  label: TrendLabel;
  /** Partite guardate (al più `RECENT_WINDOW`). */
  window: number;
}

/** Partite (partitelle + ufficiali) sotto le quali la curva non si legge. */
export const MIN_GAMES_FOR_CURVE = 4;
/** Ultime partite guardate dal trend. */
export const RECENT_WINDOW = 4;
/**
 * Variazione del livello nelle ultime partite oltre la quale c'è un trend:
 * almeno `TREND_THRESHOLD`, e di più finché la stima è incerta (all'inizio
 * ogni partita sposta il livello di parecchio, e sarebbe solo rumore).
 */
const TREND_THRESHOLD = 2.0;
const TREND_SIGMA_FACTOR = 0.4;

export function isGame(p: CurvePoint): boolean {
  return p.kind !== "other";
}

export function curveStatus(games: number): CurveStatus {
  if (games === 0) return "senza";
  return games < MIN_GAMES_FOR_CURVE ? "formazione" : "leggibile";
}

/** Tacche dell'indicatore "quanti dati": 0 nessuno, 3 abbastanza da fidarsi. */
export function dataLevel(games: number): 0 | 1 | 2 | 3 {
  if (games === 0) return 0;
  if (games < MIN_GAMES_FOR_CURVE) return 1;
  return games < 10 ? 2 : 3;
}

/**
 * Trend delle ultime `RECENT_WINDOW` partite: somma quanto ha spostato il
 * livello ciascuna di esse. Cambi di ruolo e correzioni a mano non contano,
 * anche se cadono nella finestra. `null` finché la curva non è leggibile.
 */
export function recentTrend(points: CurvePoint[], initialMu: number): RecentTrend | null {
  const gameIdx = points.flatMap((p, i) => (isGame(p) ? [i] : []));
  if (gameIdx.length < MIN_GAMES_FOR_CURVE) return null;

  const window = gameIdx.slice(-RECENT_WINDOW);
  const delta = window.reduce(
    (sum, i) => sum + points[i].mu - (i > 0 ? points[i - 1].mu : initialMu),
    0
  );
  const sigma = points[points.length - 1].sigma;
  const threshold = Math.max(TREND_THRESHOLD, TREND_SIGMA_FACTOR * sigma);

  const label: TrendLabel = delta > threshold ? "salita" : delta < -threshold ? "calo" : "stabile";
  return { label, window: window.length };
}

/** Scala comune delle curve: min e max dei livelli di tutta la rosa. */
export function curveScale(series: CurvePoint[][]): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const s of series) {
    for (const p of s) {
      if (p.mu < min) min = p.mu;
      if (p.mu > max) max = p.mu;
    }
  }
  if (!Number.isFinite(min)) return null;
  // Un po' di margine, e mai una scala piatta (rosa con un solo valore).
  const pad = Math.max(1, (max - min) * 0.05);
  return { min: min - pad, max: max + pad };
}

/** Etichette dello staff (pannello solo in italiano). */
export const TREND_LABELS: Record<TrendLabel, string> = {
  salita: "In salita",
  calo: "In calo",
  stabile: "Stabile",
};
