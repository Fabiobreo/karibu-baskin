// Helper per determinare se la partecipazione di un giocatore a una partita
// è "in prestito" (cioè il giocatore non è membro della squadra che disputa
// la partita per quella stagione).
//
// Usato sia dalle API stats sia dalle API callups per impostare il flag
// `isLoan` automaticamente al salvataggio, e dallo script di backfill.

import { prisma } from "@/lib/db";

export type LoanLookup = {
  match: { teamId: string; teamSeason: string };
  memberUserIds: Set<string>;
  memberChildIds: Set<string>;
};

/**
 * Carica i membri della squadra "target" per cui si valuta il prestito.
 * - matchId: la partita di riferimento
 * - targetTeamId: la squadra rispetto alla quale calcolare il prestito; se non
 *   specificata viene usata `match.teamId` (comportamento legacy). Per le
 *   amichevoli interne può essere `match.teamId` OPPURE `match.opponentTeamId`.
 */
export async function buildLoanLookup(
  matchId: string,
  targetTeamId?: string
): Promise<LoanLookup | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      teamId: true,
      opponentTeamId: true,
      team: { select: { season: true } },
      opponentTeam: { select: { season: true } },
    },
  });
  if (!match) return null;

  const effectiveTeamId = targetTeamId ?? match.teamId;
  const effectiveSeason =
    effectiveTeamId === match.opponentTeamId
      ? (match.opponentTeam?.season ?? match.team.season)
      : match.team.season;

  const memberships = await prisma.teamMembership.findMany({
    where: { team: { id: effectiveTeamId, season: effectiveSeason } },
    select: { userId: true, childId: true },
  });

  return {
    match: { teamId: effectiveTeamId, teamSeason: effectiveSeason },
    memberUserIds: new Set(memberships.map((m) => m.userId).filter((x): x is string => !!x)),
    memberChildIds: new Set(memberships.map((m) => m.childId).filter((x): x is string => !!x)),
  };
}

/**
 * Determina se la partecipazione di un giocatore alla partita è un prestito.
 * Un giocatore è "in prestito" se non figura tra i TeamMembership della
 * squadra che disputa la partita per la stagione corrente.
 */
export function isLoanParticipation(
  lookup: LoanLookup,
  player: { userId?: string | null; childId?: string | null }
): boolean {
  if (player.userId) return !lookup.memberUserIds.has(player.userId);
  if (player.childId) return !lookup.memberChildIds.has(player.childId);
  return false;
}
