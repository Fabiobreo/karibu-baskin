// ── Simulatore Sfida (sestetto vs sestetto) ──────────────────────────────────
//
// Dato due gruppi di giocatori (μ TrueSkill), stima la probabilità di vittoria
// e genera un risultato PLAUSIBILE e RIPRODUCIBILE (seeded). Il rumore seedato
// fa emergere gli "upset" in proporzione al divario di forza: è esattamente ciò
// che rende l'esito divertente e condivisibile.
//
// Riusa la stessa approssimazione normcdf + la varianza combinata TrueSkill già
// adottate da matchQuality.ts e lineupOptimizer.ts. Nessuna dipendenza esterna,
// nessun DB: è logica pura, testabile in isolamento.

import { TRUESKILL } from "./trueskill";

/** Approssimazione logistica di Φ(x) — errore < 0.003 nell'intero dominio. */
function normcdf(x: number): number {
  return 1 / (1 + Math.exp(-1.7 * x));
}

// PRNG deterministico (Mulberry32) + hash stringa→seed. Copia locale minima per
// non accoppiare questo modulo a season/teamGenerator (dove sono privati).
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (Math.imul(31, hash) + s.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/** Variabile normale standard via Box-Muller, alimentata da un PRNG seedato. */
function gaussian(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** μ effettivo: fallback a μ₀ per i giocatori non ancora valutati. */
function effectiveMu(mu: number | null): number {
  return mu ?? TRUESKILL.MU;
}

/** Punti medi di un sestetto baskin "tipo": centro della distribuzione. */
const BASE_POINTS = 48;
/** Deviazione standard del rumore sul punteggio (in punti). */
const SCORE_SD = 9;
/** Giocatori notional in campo (per normalizzare squadre di taglia diversa). */
const ON_COURT = 6;

export type SimLabel = "Equilibrata" | "FavoritiA" | "FavoritiB";

export interface SimInput {
  /** μ dei giocatori della squadra A (null = non valutato → μ₀). */
  teamAMus: (number | null)[];
  /** μ dei giocatori della squadra B (null = non valutato → μ₀). */
  teamBMus: (number | null)[];
  /** Seme riproducibile: stesso seed ⇒ stesso risultato. */
  seed: string;
}

export interface SimResult {
  /** Probabilità analitica di vittoria della squadra A [0, 1]. */
  winProbabilityA: number;
  /** Etichetta leggibile basata sulla probabilità. */
  label: SimLabel;
  scoreA: number;
  scoreB: number;
  /** Vincitore derivato dal punteggio simulato (può smentire i favoriti). */
  winner: "A" | "B" | "draw";
}

/**
 * Simula una sfida tra due gruppi di giocatori.
 *
 * - `winProbabilityA` è la stima analitica (deterministica nei μ).
 * - Il punteggio è seedato su `seed`: cambiando seed (es. "rivincita") cambia
 *   l'esito mantenendo la stessa distribuzione. Il vincitore deriva dal
 *   punteggio, quindi gli upset sono possibili e proporzionali al divario.
 *
 * Squadre vuote ⇒ trattate come forza media (μ₀) per non rompere il calcolo;
 * la UI impedisce comunque la simulazione senza giocatori.
 */
export function simulateMatch({ teamAMus, teamBMus, seed }: SimInput): SimResult {
  const musA = teamAMus.map(effectiveMu);
  const musB = teamBMus.map(effectiveMu);

  const avgA = musA.length > 0 ? musA.reduce((s, m) => s + m, 0) / musA.length : TRUESKILL.MU;
  const avgB = musB.length > 0 ? musB.reduce((s, m) => s + m, 0) / musB.length : TRUESKILL.MU;

  // Probabilità di vittoria: confronto a parità di taglia (ON_COURT giocatori).
  const varPerPlayer = TRUESKILL.BETA ** 2 + TRUESKILL.SIGMA ** 2;
  const combinedSigma = Math.sqrt(2 * ON_COURT * varPerPlayer);
  const delta = (avgA - avgB) * ON_COURT;
  const winProbabilityA = normcdf(delta / combinedSigma);

  let label: SimLabel = "Equilibrata";
  if (winProbabilityA >= 0.6) label = "FavoritiA";
  else if (winProbabilityA <= 0.4) label = "FavoritiB";

  // Punteggio atteso proporzionale alla quota di forza, centrato su BASE_POINTS.
  const totalAvg = avgA + avgB || 2 * TRUESKILL.MU;
  const expA = BASE_POINTS * ((2 * avgA) / totalAvg);
  const expB = BASE_POINTS * ((2 * avgB) / totalAvg);

  const rand = mulberry32(stringToSeed(seed));
  let scoreA = Math.round(expA + gaussian(rand) * SCORE_SD);
  let scoreB = Math.round(expB + gaussian(rand) * SCORE_SD);
  scoreA = Math.max(10, scoreA);
  scoreB = Math.max(10, scoreB);

  // I pareggi nel baskin sono rari: rompiamo il pari con un tiro seedato in
  // favore di chi è (leggermente) più probabile vincente.
  if (scoreA === scoreB) {
    if (rand() < winProbabilityA) scoreA += 1;
    else scoreB += 1;
  }

  const winner: SimResult["winner"] = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "draw";

  return { winProbabilityA, label, scoreA, scoreB, winner };
}
