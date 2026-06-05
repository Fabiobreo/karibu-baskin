import { auth } from "@/lib/authjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import SiteHeader from "@/components/layout/SiteHeader";
import MieDisponibilitaClient, {
  type AvailabilityMatch,
} from "@/components/matches/MieDisponibilitaClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Le mie disponibilità | Karibu Baskin" };
export const revalidate = 0;

export default async function MieDisponibilitaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
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

  const matches =
    allTeamIds.length === 0
      ? []
      : await prisma.match.findMany({
          where: {
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

  const items: AvailabilityMatch[] = [];
  for (const m of matches) {
    const teamsInMatch = [m.teamId, m.opponentTeamId].filter((x): x is string => !!x);
    const entities: AvailabilityMatch["entities"] = [];

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

  return (
    <>
      <SiteHeader />
      <MieDisponibilitaClient initialMatches={items} />
    </>
  );
}
