import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import AdminGironeWorkspaceClient from "@/components/AdminGironeWorkspaceClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Workspace Girone | Admin" };

type Params = { params: Promise<{ groupId: string }> };

export default async function AdminGironeWorkspacePage({ params }: Params) {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.appRole, "COACH")) {
    redirect("/admin/login");
  }
  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      team: { select: { id: true, name: true, season: true, color: true } },
      matches: {
        orderBy: [{ matchday: "asc" }, { date: "asc" }],
        select: {
          id: true,
          date: true,
          isHome: true,
          matchday: true,
          ourScore: true,
          theirScore: true,
          result: true,
          opponent: { select: { id: true, name: true, slug: true } },
          _count: { select: { playerStats: true } },
        },
      },
      groupMatches: {
        orderBy: [{ matchday: "asc" }, { date: "asc" }],
        include: {
          homeTeam: { select: { id: true, name: true, slug: true } },
          awayTeam: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });
  if (!group) notFound();

  const [opponents, teams, allGroups] = await Promise.all([
    prisma.opposingTeam.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, city: true },
    }),
    prisma.competitiveTeam.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      select: { id: true, name: true, season: true, color: true },
    }),
    prisma.group.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      select: { id: true, name: true, season: true, championship: true, teamId: true },
    }),
  ]);

  return (
    <AdminGironeWorkspaceClient
      group={{
        id: group.id,
        name: group.name,
        season: group.season,
        championship: group.championship,
        teamId: group.teamId,
        team: group.team,
      }}
      ourMatches={group.matches.map((m) => ({
        ...m,
        date: m.date.toISOString(),
      }))}
      groupMatches={group.groupMatches.map((gm) => ({
        ...gm,
        date: gm.date ? gm.date.toISOString() : null,
      }))}
      allOpponents={opponents}
      ourTeams={teams}
      allGroups={allGroups}
    />
  );
}
