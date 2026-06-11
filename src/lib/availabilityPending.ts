import { prisma } from "@/lib/db";

/**
 * Conta le disponibilità non ancora dichiarate (utente + figli) per le partite future.
 * Una "disponibilità pendente" è una coppia persona×partita senza riga MatchAvailability.
 * Stessa logica di selezione di /profilo/disponibilita (entità per squadra coinvolta).
 */
export async function countPendingAvailabilities(userId: string): Promise<number> {
  const [userMemberships, children] = await Promise.all([
    prisma.teamMembership.findMany({
      where: { userId },
      select: { teamId: true },
    }),
    prisma.child.findMany({
      where: { parentId: userId },
      select: { id: true, teamMemberships: { select: { teamId: true } } },
    }),
  ]);

  const userTeamIds = userMemberships.map((m) => m.teamId);
  const childTeamIdsByChildId = new Map<string, string[]>(
    children.map((c) => [c.id, c.teamMemberships.map((m) => m.teamId)])
  );
  const allTeamIds = Array.from(
    new Set([...userTeamIds, ...children.flatMap((c) => c.teamMemberships.map((m) => m.teamId))])
  );
  if (allTeamIds.length === 0) return 0;

  const matches = await prisma.match.findMany({
    where: {
      date: { gte: new Date() },
      OR: [{ teamId: { in: allTeamIds } }, { opponentTeamId: { in: allTeamIds } }],
    },
    select: {
      teamId: true,
      opponentTeamId: true,
      availabilities: {
        where: {
          OR: [
            { userId },
            ...(children.length > 0 ? [{ childId: { in: children.map((c) => c.id) } }] : []),
          ],
        },
        select: { userId: true, childId: true },
      },
    },
  });

  let pending = 0;
  for (const m of matches) {
    const teamsInMatch = [m.teamId, m.opponentTeamId].filter((x): x is string => !!x);
    if (
      userTeamIds.some((tid) => teamsInMatch.includes(tid)) &&
      !m.availabilities.some((a) => a.userId === userId)
    ) {
      pending++;
    }
    for (const child of children) {
      const childTeamIds = childTeamIdsByChildId.get(child.id) ?? [];
      if (
        childTeamIds.some((tid) => teamsInMatch.includes(tid)) &&
        !m.availabilities.some((a) => a.childId === child.id)
      ) {
        pending++;
      }
    }
  }
  return pending;
}
