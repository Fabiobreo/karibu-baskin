// ── Lineup Optimizer — Fase 4 TrueSkill ──────────────────────────────────────
//
// Dato il roster dei convocati selezionati, enumera tutte le formazioni valide
// secondo il regolamento baskin (vincolo A) e restituisce le top-N per skill.
//
// Vincolo A (6 giocatori in campo):
//   1. Esattamente 1 tra R1 e R2 (mai insieme, mai entrambi assenti).
//   2. Somma dei punti ruolo ≤ 23.
//   3. Tra i giocatori R4+R5 in campo: ≥1 femmina E ≥1 maschio.
//      (vincolo vacuamente soddisfatto se non ci sono R4/R5)
//
// Il punteggio di una formazione è la somma dei μ TrueSkill (fallback = μ₀ se
// il giocatore non è ancora stato valutato).

import { TRUESKILL } from "./trueskill";
import { isLineupValid } from "./lineupRules";
import type { CandidateInput } from "@/lib/matches/callupStats";

/** Approssimazione logistica di Φ(x) — errore < 0.003. */
function normcdf(x: number): number {
  return 1 / (1 + Math.exp(-1.7 * x));
}

/** μ effettivo: fallback a μ₀ se non ancora valutato. */
function effectiveMu(c: CandidateInput): number {
  return c.ratingMu ?? TRUESKILL.MU;
}

// ── Combinazioni C(n, k) ─────────────────────────────────────────────────────

function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of combinations(arr.slice(i + 1), k - 1)) {
      yield [arr[i], ...rest];
    }
  }
}

// ── Validazione formazione ────────────────────────────────────────────────────

function isValidLineup(players: CandidateInput[]): boolean {
  // Regole condivise con il simulatore sfida (vedi lib/rating/lineupRules.ts).
  return isLineupValid(players);
}

// ── Probabilità di vittoria ───────────────────────────────────────────────────

function computeWinProbability(lineupMus: number[], opponentMuPerPlayer: number): number {
  const N = lineupMus.length;
  const ourTotal = lineupMus.reduce((s, m) => s + m, 0);
  const oppTotal = opponentMuPerPlayer * N;
  const varPerPlayer = TRUESKILL.BETA ** 2 + TRUESKILL.SIGMA ** 2;
  const combinedSigma = Math.sqrt(2 * N * varPerPlayer);
  return normcdf((ourTotal - oppTotal) / combinedSigma);
}

// ── Tipi pubblici ─────────────────────────────────────────────────────────────

export interface LineupResult {
  players: CandidateInput[];
  muSum: number;
  roleSum: number;
  winProbability: number | null;
}

export interface RoleDepthEntry {
  role: number;
  /** Giocatori nella formazione con questo ruolo. */
  inLineup: CandidateInput[];
  /** Giocatori selezionati ma non in formazione con questo ruolo. */
  onBench: CandidateInput[];
  /**
   * Gap μ = min(starter μ) − max(bench μ).
   * Positivo = la prima riserva è più debole del titolare più debole.
   * null se non c'è riserva.
   */
  gap: number | null;
}

export interface OptimizerResult {
  topLineups: LineupResult[];
  roleDepth: RoleDepthEntry[];
  feasibleCount: number;
}

// ── Funzione principale ───────────────────────────────────────────────────────

/**
 * Trova le top-N formazioni valide (per μ totale) tra i convocati selezionati.
 *
 * @param selected     Candidati selezionati (include non-valutati → μ = μ₀)
 * @param opponentMu   μ medio per giocatore dell'avversario (null = sconosciuto)
 * @param topN         Numero di formazioni da restituire (default 5)
 * @returns null se meno di 6 giocatori con ruolo assegnato sono selezionati
 */
export function optimizeLineup(
  selected: CandidateInput[],
  opponentMu: number | null,
  topN = 5
): OptimizerResult | null {
  // Considera solo giocatori con ruolo (senza ruolo non entrano in campo)
  const eligible = selected.filter((p) => p.sportRole != null);
  if (eligible.length < 6) return null;

  const valid: LineupResult[] = [];
  for (const combo of combinations(eligible, 6)) {
    if (!isValidLineup(combo)) continue;
    const mus = combo.map(effectiveMu);
    const muSum = mus.reduce((s, m) => s + m, 0);
    valid.push({
      players: combo,
      muSum,
      roleSum: combo.reduce((s, p) => s + (p.sportRole ?? 0), 0),
      winProbability: opponentMu != null ? computeWinProbability(mus, opponentMu) : null,
    });
  }

  valid.sort((a, b) => b.muSum - a.muSum);
  const topLineups = valid.slice(0, topN);

  const roleDepth = computeRoleDepth(eligible, topLineups[0]?.players ?? []);

  return { topLineups, roleDepth, feasibleCount: valid.length };
}

function computeRoleDepth(
  eligible: CandidateInput[],
  bestLineup: CandidateInput[]
): RoleDepthEntry[] {
  const lineupIds = new Set(bestLineup.map((p) => `${p.kind}-${p.id}`));

  // Raccoglie tutti i ruoli presenti nei convocati eligibili
  const roles = [...new Set(eligible.map((p) => p.sportRole!))].sort((a, b) => a - b);

  return roles.map((role) => {
    const all = eligible.filter((p) => p.sportRole === role);
    const inLineup = all.filter((p) => lineupIds.has(`${p.kind}-${p.id}`));
    const onBench = all.filter((p) => !lineupIds.has(`${p.kind}-${p.id}`));

    let gap: number | null = null;
    if (inLineup.length > 0 && onBench.length > 0) {
      const minStarterMu = Math.min(...inLineup.map(effectiveMu));
      const maxBenchMu = Math.max(...onBench.map(effectiveMu));
      gap = minStarterMu - maxBenchMu;
    }

    return { role, inLineup, onBench, gap };
  });
}
