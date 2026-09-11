import { prisma } from "@/lib/db";
import { simulateMatch, type SimResult } from "./matchSimulator";
import { validateLineup, type LineupPlayerLike } from "./lineupRules";
import { buildSimSeed, parseSimPlayerKey } from "./simulatorShared";

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
export async function runSimulation(
  keysA: string[],
  keysB: string[],
  nonce: number
): Promise<SimulationOutcome> {
  const allKeys = [...keysA, ...keysB];
  // Nessun giocatore può comparire due volte, né nella stessa squadra né in entrambe.
  if (new Set(allKeys).size !== allKeys.length) return { ok: false, reason: "invalid-keys" };

  const parsed = allKeys.map(parseSimPlayerKey);
  if (parsed.some((p) => p === null)) return { ok: false, reason: "invalid-keys" };

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

  const sideA = keysA.map((k) => byKey.get(k));
  const sideB = keysB.map((k) => byKey.get(k));
  if (sideA.some((p) => !p) || sideB.some((p) => !p)) return { ok: false, reason: "invalid-keys" };

  const playersA = sideA as RatedPlayer[];
  const playersB = sideB as RatedPlayer[];
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
