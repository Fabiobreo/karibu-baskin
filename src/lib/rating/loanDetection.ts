// Helper per determinare se la partecipazione di un giocatore a una partita
// è "in prestito" (cioè il giocatore non è membro della squadra che disputa
// la partita per quella stagione).
//
// Usato sia dalle API stats sia dalle API callups per impostare il flag
// `isLoan` automaticamente al salvataggio, e dallo script di backfill.

import { prisma } from "@/lib/db";
import { rosterTeamIds } from "@/lib/matches/mixedTeam";
import { loadTeamPeriods, wasMemberAt } from "@/lib/matches/teamHistory";

export type LoanLookup = {
  match: { teamId: string; teamSeason: string; date: Date };
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
      date: true,
      team: { select: { id: true, season: true, isMixed: true } },
      opponentTeam: { select: { id: true, season: true, isMixed: true } },
    },
  });
  if (!match) return null;

  const effectiveTeamId = targetTeamId ?? match.teamId;
  const effectiveTeam =
    effectiveTeamId === match.opponentTeamId && match.opponentTeam
      ? match.opponentTeam
      : match.team;
  const effectiveSeason = effectiveTeam.season;

  // La Karibu di stagione schiera i tesserati di tutta la stagione: per lei nessun
  // giocatore della stagione è in prestito.
  const teamIds = await rosterTeamIds([effectiveTeam]);
  // Rosa del giorno della partita, dallo storico delle squadre
  // (@/lib/matches/teamHistory): conta chi c'era allora e ha cambiato squadra
  // dopo; chi è arrivato con un cambio dopo la partita, quel giorno era altrove.
  const inSeason = { teamId: { in: teamIds }, team: { season: effectiveSeason } };
  const [current, past] = await Promise.all([
    prisma.teamMembership.findMany({
      where: inSeason,
      select: { userId: true, childId: true },
    }),
    prisma.pastTeamMembership.findMany({
      where: inSeason,
      select: { userId: true, childId: true },
    }),
  ]);
  const userIds = [
    ...new Set([...current, ...past].map((r) => r.userId).filter((x): x is string => !!x)),
  ];
  const childIds = [
    ...new Set([...current, ...past].map((r) => r.childId).filter((x): x is string => !!x)),
  ];
  const periods = await loadTeamPeriods(userIds, childIds);
  const memberOnMatchDay = (key: string) =>
    teamIds.some((teamId) => wasMemberAt(periods.get(key) ?? [], teamId, match.date));

  return {
    match: { teamId: effectiveTeamId, teamSeason: effectiveSeason, date: match.date },
    memberUserIds: new Set(userIds.filter((id) => memberOnMatchDay(`user-${id}`))),
    memberChildIds: new Set(childIds.filter((id) => memberOnMatchDay(`child-${id}`))),
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
