import { NextResponse } from "next/server";
import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";

// GET /api/users/me/availabilities
// Restituisce le partite future delle squadre dell'utente (User + Child)
// con lo stato di disponibilità corrente.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const userId = session.user.id;

  const [userMemberships, children] = await Promise.all([
    prisma.teamMembership.findMany({
      where: { userId },
      select: { teamId: true },
    }),
    prisma.child.findMany({
      where: { parentId: userId },
      select: {
        id: true,
        name: true,
        teamMemberships: { select: { teamId: true } },
      },
    }),
  ]);

  const userTeamIds = userMemberships.map((m) => m.teamId);
  const childTeamIdsByChildId = new Map<string, string[]>(
    children.map((c) => [c.id, c.teamMemberships.map((m) => m.teamId)])
  );
  const allTeamIds = Array.from(
    new Set([...userTeamIds, ...children.flatMap((c) => c.teamMemberships.map((m) => m.teamId))])
  );

  const now = new Date();
  const matches =
    allTeamIds.length === 0
      ? []
      : await prisma.match.findMany({
          where: {
            date: { gte: now },
            OR: [{ teamId: { in: allTeamIds } }, { opponentTeamId: { in: allTeamIds } }],
          },
          orderBy: { date: "asc" },
          include: {
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

  // Per ogni partita, lista delle "entità" (user o child) che ne fanno parte
  // e la rispettiva disponibilità corrente.
  const items = matches.map((m) => {
    const teamsInMatch = [m.teamId, m.opponentTeamId].filter((x): x is string => !!x);

    const entities: Array<{
      kind: "user" | "child";
      id: string;
      name: string;
      teamId: string;
      teamName: string;
      teamColor: string | null;
      available: boolean | null;
    }> = [];

    // L'utente partecipa se è in una delle due squadre della partita
    if (userTeamIds.some((tid) => teamsInMatch.includes(tid))) {
      const av = m.availabilities.find((a) => a.userId === userId);
      const userTeamId = teamsInMatch.find((tid) => userTeamIds.includes(tid))!;
      const teamRef = userTeamId === m.team.id ? m.team : m.opponentTeam;
      entities.push({
        kind: "user",
        id: userId,
        name: session.user.name ?? "Tu",
        teamId: userTeamId,
        teamName: teamRef?.name ?? "—",
        teamColor: teamRef?.color ?? null,
        available: av ? av.available : null,
      });
    }

    // Ogni figlio che è in una delle due squadre della partita
    for (const child of children) {
      const childTeamIds = childTeamIdsByChildId.get(child.id) ?? [];
      const childTeamId = teamsInMatch.find((tid) => childTeamIds.includes(tid));
      if (!childTeamId) continue;
      const av = m.availabilities.find((a) => a.childId === child.id);
      const teamRef = childTeamId === m.team.id ? m.team : m.opponentTeam;
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

    if (entities.length === 0) return null;

    const opponentLabel = m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario";

    return {
      matchId: m.id,
      slug: m.slug,
      date: m.date.toISOString(),
      isHome: m.isHome,
      venue: m.venue,
      matchType: m.matchType,
      opponentLabel,
      entities,
    };
  });

  return NextResponse.json(items.filter((x): x is NonNullable<typeof x> => x !== null));
}
