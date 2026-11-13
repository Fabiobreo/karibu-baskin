import { prisma } from "@/lib/db";
import { simulateMatch, type SimResult } from "./matchSimulator";
import { validateLineup, type LineupPlayerLike } from "./lineupRules";
import { buildSimSeed, parseSimPlayerKey } from "./simulatorShared";
import { MAX_QUARTERS_EACH, QUARTERS } from "@/lib/games/sfida";
import { mulberry32, stringToSeed } from "@/lib/seededRandom";

export type SimulationOutcome =
  | { ok: true; result: SimResult }
  | { ok: false; reason: "invalid-keys" | "invalid-lineup" };

interface RatedPlayer extends LineupPlayerLike {
  mu: number | null;
}

/**
 * Simula una sfida lato server.
 *
 * Il TrueSkill è visibile solo a COACH e ADMIN, ma il simulatore è per tutti i
 * tesserati: per tenere insieme le due cose il rating non lascia mai il server.
 * Il client manda le chiavi dei giocatori schierati e riceve solo probabilità e
 * punteggio, che sono aggregati sulla formazione.
 *
 * Entrambe le formazioni devono essere valide secondo le regole Baskin, come
 * nel client. Qui però il controllo ha anche un secondo scopo: senza di esso,
 * una sfida "uno contro uno" rivelerebbe il rating relativo di due singole
 * persone, aggirando proprio la riservatezza che questo modulo esiste per
 * garantire.
 */
/** Livello e dati di gioco dei giocatori, per chiave. `null` se una chiave non torna. */
async function loadRated(keys: string[]): Promise<Map<string, RatedPlayer> | null> {
  const parsed = keys.map(parseSimPlayerKey);
  if (parsed.some((p) => p === null)) return null;

  const userIds = parsed.filter((p) => p!.kind === "user").map((p) => p!.id);
  const childIds = parsed.filter((p) => p!.kind === "child").map((p) => p!.id);

  const [users, children] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, sportRole: true, gender: true, ratingMu: true },
        })
      : [],
    childIds.length > 0
      ? prisma.child.findMany({
          where: { id: { in: childIds } },
          select: { id: true, sportRole: true, gender: true, ratingMu: true },
        })
      : [],
  ]);

  const byKey = new Map<string, RatedPlayer>();
  for (const u of users) {
    byKey.set(`user-${u.id}`, { sportRole: u.sportRole, gender: u.gender, mu: u.ratingMu });
  }
  for (const c of children) {
    byKey.set(`child-${c.id}`, { sportRole: c.sportRole, gender: c.gender, mu: c.ratingMu });
  }
  return keys.every((k) => byKey.has(k)) ? byKey : null;
}

export async function runSimulation(
  keysA: string[],
  keysB: string[],
  nonce: number
): Promise<SimulationOutcome> {
  const allKeys = [...keysA, ...keysB];
  // Nessun giocatore può comparire due volte, né nella stessa squadra né in entrambe.
  if (new Set(allKeys).size !== allKeys.length) return { ok: false, reason: "invalid-keys" };

  const byKey = await loadRated(allKeys);
  if (!byKey) return { ok: false, reason: "invalid-keys" };

  const playersA = keysA.map((k) => byKey.get(k)!);
  const playersB = keysB.map((k) => byKey.get(k)!);
  if (!validateLineup(playersA).valid || !validateLineup(playersB).valid) {
    return { ok: false, reason: "invalid-lineup" };
  }

  return {
    ok: true,
    result: simulateMatch({
      teamAMus: playersA.map((p) => p.mu),
      teamBMus: playersB.map((p) => p.mu),
      seed: buildSimSeed(keysA, keysB, nonce),
    }),
  };
}

/** Risultato di una partita intera: solo i punteggi, mai probabilità (UX-69). */
export interface FullMatchResult {
  quarters: { a: number; b: number }[];
  scoreA: number;
  scoreB: number;
  winner: "A" | "B";
}

export type FullMatchOutcome =
  | { ok: true; result: FullMatchResult }
  | { ok: false; reason: "invalid-keys" | "invalid-lineup" };

/**
 * Partita intera in 4 tempi (UX-69): ogni tempo è una sfida fra due formazioni
 * valide, con il suo seme, e i punti si sommano. Ogni persona sta da un lato
 * solo e gioca al massimo tre tempi. Al client vanno i soli punteggi: niente
 * probabilità per tempo, che confrontate fra tempi con e senza qualcuno
 * direbbero troppo sul suo livello.
 */
export async function runMatchSimulation(
  quartersA: string[][],
  quartersB: string[][],
  nonce: number
): Promise<FullMatchOutcome> {
  if (quartersA.length !== QUARTERS || quartersB.length !== QUARTERS) {
    return { ok: false, reason: "invalid-lineup" };
  }
  const sideA = new Set(quartersA.flat());
  const sideB = new Set(quartersB.flat());
  if ([...sideA].some((k) => sideB.has(k))) return { ok: false, reason: "invalid-keys" };
  for (const lineup of [...quartersA, ...quartersB]) {
    if (new Set(lineup).size !== lineup.length) return { ok: false, reason: "invalid-keys" };
  }
  for (const side of [quartersA, quartersB]) {
    const count = new Map<string, number>();
    for (const k of side.flat()) count.set(k, (count.get(k) ?? 0) + 1);
    if ([...count.values()].some((n) => n > MAX_QUARTERS_EACH)) {
      return { ok: false, reason: "invalid-lineup" };
    }
  }

  const byKey = await loadRated([...sideA, ...sideB]);
  if (!byKey) return { ok: false, reason: "invalid-keys" };

  const quarters: { a: number; b: number }[] = [];
  let probA = 0;
  for (let q = 0; q < QUARTERS; q++) {
    const a = quartersA[q].map((k) => byKey.get(k)!);
    const b = quartersB[q].map((k) => byKey.get(k)!);
    if (!validateLineup(a).valid || !validateLineup(b).valid) {
      return { ok: false, reason: "invalid-lineup" };
    }
    const r = simulateMatch({
      teamAMus: a.map((p) => p.mu),
      teamBMus: b.map((p) => p.mu),
      seed: `${buildSimSeed(quartersA[q], quartersB[q], nonce)}|q${q}`,
      quarter: true,
    });
    probA += r.winProbabilityA / QUARTERS;
    quarters.push({ a: r.scoreA, b: r.scoreB });
  }

  // Nel baskin non si pareggia: un punto in più nell'ultimo tempo, a chi lo
  // dice un tiro seminato (pesato sulla forza media, come nel sei contro sei).
  const total = (side: "a" | "b") => quarters.reduce((sum, x) => sum + x[side], 0);
  if (total("a") === total("b")) {
    const rand = mulberry32(stringToSeed(`${nonce}|${quartersA.flat().join(",")}|tie`));
    quarters[QUARTERS - 1][rand() < probA ? "a" : "b"] += 1;
  }
  const scoreA = total("a");
  const scoreB = total("b");
  return {
    ok: true,
    result: { quarters, scoreA, scoreB, winner: scoreA > scoreB ? "A" : "B" },
  };
}
