// ── TrueSkill (implementazione self-contained, 2 squadre) ────────────────────
//
// Rating individuale (μ, σ). La skill di una squadra è la somma dei μ dei
// giocatori in campo. Tutti gli aggiornamenti del sistema sono a DUE squadre:
// anche le partitelle a 3 squadre vengono registrate come scontri a coppie
// (matchup "AB" / "AC" / "BC"), quindi il caso 2-team copre tutto.
//
// Formule: Herbrich, Minka, Graepel — "TrueSkill: A Bayesian Skill Rating
// System" (2007), nella forma divulgata da Moserware "Computing Your Skill".
// Nessuna dipendenza esterna: φ/Φ/Φ⁻¹ sono implementate qui sotto.
//
// La categoria del giocatore (1-5) NON entra nel rating: è un vincolo di
// lineup gestito altrove. Qui si modella una sola skill per giocatore.

export interface Rating {
  mu: number;
  sigma: number;
}

export const TRUESKILL = {
  /** μ iniziale */
  MU: 25,
  /** σ iniziale (= μ/3) */
  SIGMA: 25 / 3,
  /** β — ampiezza della "classe di skill"; varianza della performance per giocatore (= σ₀/2) */
  BETA: 25 / 6,
  /** τ — dinamica: σ aggiunta ad ogni partita per non "congelare" il rating (= σ₀/100) */
  TAU: 25 / 300,
  /** probabilità di pareggio assunta dal modello (partitelle: pareggi rari) */
  DRAW_PROBABILITY: 0.05,
} as const;

/** Rating di default per un giocatore mai valutato. */
export function defaultRating(): Rating {
  return { mu: TRUESKILL.MU, sigma: TRUESKILL.SIGMA };
}

/**
 * Punteggio ordinale conservativo (μ − 3σ): la skill "garantita con ~99%".
 * Usato per ordinare/confrontare i giocatori, mai μ da solo.
 */
export function ordinal(r: Rating): number {
  return r.mu - 3 * r.sigma;
}

// ── Funzioni gaussiane ───────────────────────────────────────────────────────

const SQRT_2 = Math.SQRT2;
const SQRT_2PI = Math.sqrt(2 * Math.PI);

/** Densità normale standard φ(x). */
function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

/** Errore di Gauss erf(x) — approssimazione Abramowitz & Stegun 7.1.26 (|err| < 1.5e-7). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

/** Funzione di ripartizione normale standard Φ(x). */
function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / SQRT_2));
}

/** Inversa della CDF normale standard Φ⁻¹(p) — algoritmo di Acklam (|err| < 1e-9). */
function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

// ── Funzioni di troncamento V / W ─────────────────────────────────────────────

/** V per esito decisivo (vinto/perso): φ(t−ε)/Φ(t−ε). */
function vWin(t: number, eps: number): number {
  const denom = normCdf(t - eps);
  if (denom < 1e-12) return eps - t; // limite numerico (sconfitta molto improbabile)
  return normPdf(t - eps) / denom;
}

/** W per esito decisivo. */
function wWin(t: number, eps: number): number {
  const denom = normCdf(t - eps);
  if (denom < 1e-12) {
    return t - eps < 0 ? 1 : 0;
  }
  const v = normPdf(t - eps) / denom;
  return v * (v + t - eps);
}

/** V per pareggio (due lati). */
function vDraw(t: number, eps: number): number {
  const absT = Math.abs(t);
  const denom = normCdf(eps - absT) - normCdf(-eps - absT);
  if (denom < 1e-12) return t < 0 ? -eps - t : eps - t;
  const num = normPdf(-eps - absT) - normPdf(eps - absT);
  return (t < 0 ? -num : num) / denom;
}

/** W per pareggio. */
function wDraw(t: number, eps: number): number {
  const absT = Math.abs(t);
  const denom = normCdf(eps - absT) - normCdf(-eps - absT);
  if (denom < 1e-12) return 1;
  const v = vDraw(t, eps);
  return (
    v * v + ((eps - absT) * normPdf(eps - absT) - (-eps - absT) * normPdf(-eps - absT)) / denom
  );
}

// ── Aggiornamento a due squadre ───────────────────────────────────────────────

export interface RateOptions {
  /**
   * Peso dell'aggiornamento in (0, 1] — gancio per il margin of victory.
   * 1 = TrueSkill standard. < 1 = update attenuato (partita combattuta).
   * La mappatura differenza-punti → peso vive nell'orchestratore (Fase 1),
   * non qui: questa lib resta pura.
   */
  weight?: number;
  beta?: number;
  tau?: number;
  drawProbability?: number;
}

function drawMargin(drawProbability: number, beta: number, totalPlayers: number): number {
  return normInv(0.5 * (drawProbability + 1)) * Math.sqrt(totalPlayers) * beta;
}

interface UpdateResult {
  teamA: Rating[];
  teamB: Rating[];
}

function applyUpdate(
  teamA: Rating[],
  teamB: Rating[],
  draw: boolean,
  opts: RateOptions
): UpdateResult {
  const beta = opts.beta ?? TRUESKILL.BETA;
  const tau = opts.tau ?? TRUESKILL.TAU;
  const drawProb = opts.drawProbability ?? TRUESKILL.DRAW_PROBABILITY;
  const weight = Math.min(1, Math.max(0, opts.weight ?? 1));

  const n = teamA.length + teamB.length;

  // Dinamica: gonfia σ prima dell'update (varianza che si accumula nel tempo).
  const a = teamA.map((r) => ({ mu: r.mu, sigma2: r.sigma * r.sigma + tau * tau }));
  const b = teamB.map((r) => ({ mu: r.mu, sigma2: r.sigma * r.sigma + tau * tau }));

  const sumSigma2 = [...a, ...b].reduce((s, r) => s + r.sigma2, 0);
  const c = Math.sqrt(sumSigma2 + n * beta * beta);

  const muA = a.reduce((s, r) => s + r.mu, 0);
  const muB = b.reduce((s, r) => s + r.mu, 0);
  const eps = drawMargin(drawProb, beta, n);

  // t orientato come (vincitore − perdente); per il pareggio l'orientamento è A−B.
  const t = (muA - muB) / c;
  const epsC = eps / c;

  const v = draw ? vDraw(t, epsC) : vWin(t, epsC);
  const w = draw ? wDraw(t, epsC) : wWin(t, epsC);

  // Segno del termine sulla media: A "sopra", B "sotto" (per win, A è il vincitore).
  const update = (team: { mu: number; sigma2: number }[], sign: number): Rating[] =>
    team.map((r) => {
      const meanMultiplier = r.sigma2 / c;
      const varMultiplier = r.sigma2 / (c * c);
      const newMu = r.mu + weight * sign * meanMultiplier * v;
      const newSigma2 = r.sigma2 * (1 - weight * w * varMultiplier);
      return { mu: newMu, sigma: Math.sqrt(Math.max(newSigma2, 1e-6)) };
    });

  return { teamA: update(a, +1), teamB: update(b, -1) };
}

/**
 * Aggiorna i rating dopo una vittoria della prima squadra sulla seconda.
 * @returns nuovi rating { winners, losers } nello stesso ordine degli input.
 */
export function rate2Win(
  winners: Rating[],
  losers: Rating[],
  opts: RateOptions = {}
): { winners: Rating[]; losers: Rating[] } {
  const res = applyUpdate(winners, losers, false, opts);
  return { winners: res.teamA, losers: res.teamB };
}

/** Aggiorna i rating dopo un pareggio tra le due squadre. */
export function rate2Draw(
  teamA: Rating[],
  teamB: Rating[],
  opts: RateOptions = {}
): { teamA: Rating[]; teamB: Rating[] } {
  return applyUpdate(teamA, teamB, true, opts);
}
