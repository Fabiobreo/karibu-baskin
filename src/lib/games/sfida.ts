import { MAX_ROLE_SUM, validateLineup } from "@/lib/rating/lineupRules";
import { mulberry32 } from "@/lib/seededRandom";

/**
 * La Sfida (UX-69): formazioni pronte, cambi possibili e piano dei 4 tempi.
 * Logica pura, condivisa da pagina (stato iniziale) e client (Mescola, cambi).
 * Nessun livello stimato qui: le formazioni si fanno solo con ruoli e genere,
 * il calcolo del risultato resta sul server (`runSimulation`).
 */

export const QUARTERS = 4;
/**
 * In una partita intera ognuno gioca almeno un tempo. Nessun massimo: come in
 * una partita vera, il pivot unico gioca tutti e quattro i tempi. Il
 * generatore fa comunque riposare chi ha già giocato, quando può.
 */
export const MIN_QUARTERS_EACH = 1;
/** Rosa massima di una squadra, come nel regolamento. */
export const MAX_ROSTER = 14;
/** Nome di una squadra scritto a mano. */
export const MAX_SIDE_NAME = 20;

export type SfidaMode = "full" | "six";
export type SfidaGrouping = "season" | "mixed";

export interface SfidaPlayer {
  key: string;
  sportRole: number | null;
  gender: "MALE" | "FEMALE" | null;
}

/** Chi può stare in campo: serve un ruolo Baskin. */
export function canPlaySfida(p: Pick<SfidaPlayer, "sportRole">): boolean {
  return p.sportRole !== null && p.sportRole >= 1 && p.sportRole <= 5;
}

const isPivot = (p: SfidaPlayer) => p.sportRole === 1 || p.sportRole === 2;

/** Scelta pesata: `weight` 0 esclude. `null` se nessuno ha peso. */
function pick<T>(items: readonly T[], rand: () => number, weight: (x: T) => number): T | null {
  let total = 0;
  for (const x of items) total += Math.max(0, weight(x));
  if (total <= 0) return null;
  let r = rand() * total;
  for (const x of items) {
    const w = Math.max(0, weight(x));
    if (w <= 0) continue;
    r -= w;
    if (r <= 0) return x;
  }
  for (let i = items.length - 1; i >= 0; i--) if (weight(items[i]) > 0) return items[i];
  return null;
}

/**
 * Una formazione valida a caso dalla rosa: pivot, ruolo 3, due ruolo 5 e due
 * posti liberi, poi il controllo completo. `weight` sposta la scelta (nella
 * partita intera, verso chi ha giocato meno). `null` se non ci riesce.
 */
export function randomLineup<T extends SfidaPlayer>(
  roster: readonly T[],
  rand: () => number,
  weight: (p: T) => number = () => 1,
  attempts = 120
): T[] | null {
  const pool = roster.filter(canPlaySfida);
  for (let i = 0; i < attempts; i++) {
    const chosen: T[] = [];
    const take = (filter: (p: T) => boolean) => {
      const p = pick(
        pool.filter((x) => filter(x) && !chosen.includes(x)),
        rand,
        weight
      );
      if (p) chosen.push(p);
      return p;
    };
    if (!take(isPivot) || !take((p) => p.sportRole === 3)) continue;
    if (!take((p) => p.sportRole === 5) || !take((p) => p.sportRole === 5)) continue;
    const sumSoFar = chosen.reduce((s, p) => s + (p.sportRole ?? 0), 0);
    if (!take((p) => !isPivot(p) && (p.sportRole ?? 0) <= MAX_ROLE_SUM - sumSoFar - 3)) continue;
    const sum5 = chosen.reduce((s, p) => s + (p.sportRole ?? 0), 0);
    if (!take((p) => !isPivot(p) && (p.sportRole ?? 0) <= MAX_ROLE_SUM - sum5)) continue;
    if (validateLineup(chosen).valid) return chosen;
  }
  return null;
}

/**
 * Le formazioni dei 4 tempi di una rosa: tutte valide, ognuno in campo almeno
 * un tempo. `null` se la rosa non basta per una formazione o se non si riesce
 * a far giocare tutti (troppa gente, o troppi dello stesso ruolo per 24 posti).
 */
export function quarterPlan<T extends SfidaPlayer>(
  roster: readonly T[],
  rand: () => number,
  attempts = 150
): T[][] | null {
  const pool = roster.filter(canPlaySfida);
  if (pool.length * MIN_QUARTERS_EACH > QUARTERS * 6) return null;
  for (let i = 0; i < attempts; i++) {
    const played = new Map<string, number>();
    const plan: T[][] = [];
    for (let q = 0; q < QUARTERS; q++) {
      const left = QUARTERS - q;
      const lineup = randomLineup(
        pool,
        rand,
        (p) => {
          const n = played.get(p.key) ?? 0;
          // Chi non ha ancora giocato pesa sempre di più, fino all'ultimo
          // tempo; chi ha già giocato tanto pesa poco, ma resta scelto se serve.
          return n === 0 ? 4 + 8 / left : 1 / (1 + n) ** 2;
        },
        40
      );
      if (!lineup) break;
      for (const p of lineup) played.set(p.key, (played.get(p.key) ?? 0) + 1);
      plan.push(lineup);
    }
    if (plan.length === QUARTERS && pool.every((p) => (played.get(p.key) ?? 0) >= 1)) {
      return plan;
    }
  }
  return null;
}

/** Tempi giocati da ognuno in un piano. */
export function quartersPlayed(plan: readonly (readonly SfidaPlayer[])[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const lineup of plan) for (const p of lineup) out.set(p.key, (out.get(p.key) ?? 0) + 1);
  return out;
}

/**
 * "Tutti mescolati": la rosa di tutti divisa a caso in due, ruolo per ruolo e
 * alternando, così ogni lato ha più o meno gli stessi ruoli. Niente
 * bilanciamento per livello, di proposito: la sfida deve poter essere storta.
 */
export function splitMixed<T extends SfidaPlayer>(
  players: readonly T[],
  rand: () => number
): [T[], T[]] {
  const a: T[] = [];
  const b: T[] = [];
  let turn = rand() < 0.5 ? 0 : 1;
  for (const role of [1, 2, 3, 4, 5]) {
    const group = players.filter((p) => p.sportRole === role);
    // Donne e uomini mescolati a parte, così il vincolo di genere regge da tutti e due i lati.
    for (const gender of ["FEMALE", "MALE", null] as const) {
      const sub = shuffle(
        group.filter((p) => p.gender === gender),
        rand
      );
      for (const p of sub) {
        (turn === 0 ? a : b).push(p);
        turn = 1 - turn;
      }
    }
  }
  return [a, b];
}

export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Perché qualcuno non può entrare al posto di un altro. */
export type SwapBlock = "pivot" | "sum" | "three" | "fives" | "gender" | "lastQuarter";

export interface SwapOption<T> {
  player: T;
  /** Dalla panchina o scambio con l'altra squadra. */
  from: "bench" | "other";
}

export interface SwapOptions<T> {
  options: SwapOption<T>[];
  /** Il motivo più frequente fra chi è rimasto fuori, per una riga di spiegazione. */
  blockedBy: SwapBlock | null;
}

function blockOf(lineup: readonly SfidaPlayer[]): SwapBlock | null {
  const c = validateLineup([...lineup]);
  if (c.valid) return null;
  if (!c.oneGuard) return "pivot";
  if (!c.roleSumOk) return "sum";
  if (!c.hasThree) return "three";
  if (!c.twoFives) return "fives";
  return "gender";
}

/**
 * Chi può prendere il posto di `out` (o riempire un posto vuoto, `out` null)
 * lasciando valida la formazione. Con una formazione incompleta si controllano
 * solo i vincoli che non si possono più recuperare, come in `canAddToLineup`.
 */
export function swapOptions<T extends SfidaPlayer>(args: {
  lineup: readonly T[];
  out: T | null;
  bench: readonly T[];
  /** Formazione dell'altra squadra, per gli scambi (solo sei contro sei). */
  other?: readonly T[];
  /** Partita intera: tempi giocati da ognuno nel piano attuale. */
  played?: Map<string, number>;
}): SwapOptions<T> {
  const { lineup, out, bench, other = [], played } = args;
  const rest = lineup.filter((p) => p !== out);
  const options: SwapOption<T>[] = [];
  const blocks = new Map<SwapBlock, number>();
  const block = (b: SwapBlock) => blocks.set(b, (blocks.get(b) ?? 0) + 1);

  const fits = (next: readonly T[]): SwapBlock | null => {
    if (next.length === 6) return blockOf([...next]);
    const c = validateLineup([...next]);
    if (!c.oneGuard && next.filter(isPivot).length > 1) return "pivot";
    if (!c.roleSumOk) return "sum";
    return null;
  };

  if (played && out && (played.get(out.key) ?? 0) <= MIN_QUARTERS_EACH) {
    // Chi gioca un tempo solo non esce: resterebbe a guardare tutta la partita.
    return { options: [], blockedBy: "lastQuarter" };
  }

  for (const p of bench.filter(canPlaySfida)) {
    if (lineup.includes(p)) continue;
    const b = fits([...rest, p]);
    if (b) block(b);
    else options.push({ player: p, from: "bench" });
  }
  if (out) {
    const otherRest = (q: T) => other.filter((x) => x !== q);
    for (const q of other) {
      if (fits([...rest, q]) === null && fits([...otherRest(q), out]) === null) {
        options.push({ player: q, from: "other" });
      }
    }
  }
  let blockedBy: SwapBlock | null = null;
  let most = 0;
  for (const [b, n] of blocks) {
    if (n > most) {
      most = n;
      blockedBy = b;
    }
  }
  return { options, blockedBy };
}

/** Perché una rosa non riesce a fare una formazione (UX-69). */
export type RosterShortfall = "players" | "pivot" | "three" | "fives" | "gender";

/**
 * Il primo motivo per cui una rosa non fa una formazione valida, da dire a chi
 * gioca ("manca un pivot"); `null` se ci riesce. Controlla i ruoli in ordine,
 * poi il genere fra i 4 e i 5; se tutto c'è ma non torna, sono pochi giocatori.
 */
export function rosterShortfall(roster: readonly SfidaPlayer[]): RosterShortfall | null {
  const pool = roster.filter(canPlaySfida);
  if (randomLineup(pool, mulberry32(11)) !== null) return null;
  const role = (r: number) => pool.filter((p) => p.sportRole === r);
  if (!pool.some(isPivot)) return "pivot";
  if (role(3).length === 0) return "three";
  if (role(5).length < 2) return "fives";
  const high = [...role(4), ...role(5)];
  if (!high.some((p) => p.gender === "FEMALE") || !high.some((p) => p.gender === "MALE")) {
    return "gender";
  }
  return "players";
}
