// Partite per cui l'utente (e i suoi figli) può dichiarare la disponibilità.
// Condiviso da /profilo/disponibilita, GET /api/users/me/availabilities e dal
// contatore delle disponibilità pendenti, così le tre viste non divergono.
//
// Una persona partecipa a una partita se una delle due squadre è una in cui è
// tesserata, oppure una squadra mista della stessa stagione (vedi mixedTeam.ts).

import { prisma } from "@/lib/db";
import { withMixedTeams } from "@/lib/matches/mixedTeam";
import type { AvailabilityMatch } from "@/components/matches/MieDisponibilitaClient";

type PersonKey = `user:${string}` | `child:${string}`;

async function loadEligibility(userId: string) {
  const [userMemberships, children] = await Promise.all([
    prisma.teamMembership.findMany({
      where: { userId },
      select: { team: { select: { id: true, season: true } } },
    }),
    prisma.child.findMany({
      where: { parentId: userId },
      select: {
        id: true,
        name: true,
        teamMemberships: { select: { team: { select: { id: true, season: true } } } },
      },
    }),
  ]);

  const people = new Map<PersonKey, { id: string; season: string }[]>();
  people.set(
    `user:${userId}`,
    userMemberships.map((m) => m.team)
  );
  for (const c of children) {
    people.set(
      `child:${c.id}`,
      c.teamMemberships.map((m) => m.team)
    );
  }
  const teamIdsByPerson = await withMixedTeams(people);
  const allTeamIds = [...new Set([...teamIdsByPerson.values()].flat())];

  return {
    userTeamIds: teamIdsByPerson.get(`user:${userId}`) ?? [],
    children: children.map((c) => ({
      id: c.id,
      name: c.name,
      teamIds: teamIdsByPerson.get(`child:${c.id}`) ?? [],
    })),
    allTeamIds,
  };
}

/** La prima squadra della persona che gioca la partita (le proprie prima delle miste). */
function teamInMatch(personTeamIds: string[], teamsInMatch: string[]): string | undefined {
  return personTeamIds.find((tid) => teamsInMatch.includes(tid));
}

export async function loadMyAvailabilityMatches(
  userId: string,
  userName: string,
  options: { from?: Date } = {}
): Promise<AvailabilityMatch[]> {
  const { userTeamIds, children, allTeamIds } = await loadEligibility(userId);
  if (allTeamIds.length === 0) return [];

  const matches = await prisma.match.findMany({
    where: {
      ...(options.from && { date: { gte: options.from } }),
      OR: [{ teamId: { in: allTeamIds } }, { opponentTeamId: { in: allTeamIds } }],
    },
    orderBy: { date: "asc" },
    select: {
      id: true,
      slug: true,
      date: true,
      isHome: true,
      venue: true,
      matchType: true,
      teamId: true,
      opponentTeamId: true,
      team: { select: { id: true, name: true, color: true } },
      opponent: { select: { id: true, name: true } },
      opponentTeam: { select: { id: true, name: true, color: true } },
      availabilities: {
        where: {
          OR: [
            { userId },
            ...(children.length > 0 ? [{ childId: { in: children.map((c) => c.id) } }] : []),
          ],
        },
        select: { userId: true, childId: true, available: true },
      },
    },
  });

  const items: AvailabilityMatch[] = [];
  for (const m of matches) {
    const teamsInMatch = [m.teamId, m.opponentTeamId].filter((x): x is string => !!x);
    const teamRefOf = (tid: string) => (tid === m.team.id ? m.team : m.opponentTeam);
    const entities: AvailabilityMatch["entities"] = [];

    const userTeamId = teamInMatch(userTeamIds, teamsInMatch);
    if (userTeamId) {
      const av = m.availabilities.find((a) => a.userId === userId);
      const teamRef = teamRefOf(userTeamId);
      entities.push({
        kind: "user",
        id: userId,
        name: userName,
        teamId: userTeamId,
        teamName: teamRef?.name ?? "—",
        teamColor: teamRef?.color ?? null,
        available: av ? av.available : null,
      });
    }

    for (const child of children) {
      const childTeamId = teamInMatch(child.teamIds, teamsInMatch);
      if (!childTeamId) continue;
      const av = m.availabilities.find((a) => a.childId === child.id);
      const teamRef = teamRefOf(childTeamId);
      entities.push({
        kind: "child",
        id: child.id,
        name: child.name,
        teamId: childTeamId,
        teamName: teamRef?.name ?? "—",
        teamColor: teamRef?.color ?? null,
        available: av ? av.available : null,
      });
    }

    if (entities.length === 0) continue;

    items.push({
      matchId: m.id,
      slug: m.slug,
      date: m.date.toISOString(),
      isHome: m.isHome,
      venue: m.venue,
      matchType: m.matchType,
      opponentLabel: m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario",
      entities,
    });
  }
  return items;
}

/**
 * Disponibilità non ancora dichiarate (utente + figli) per le partite future:
 * coppie persona × partita senza riga MatchAvailability.
 */
export async function countPendingAvailabilities(userId: string): Promise<number> {
  const items = await loadMyAvailabilityMatches(userId, "", { from: new Date() });
  return items.reduce(
    (sum, item) => sum + item.entities.filter((e) => e.available === null).length,
    0
  );
}
