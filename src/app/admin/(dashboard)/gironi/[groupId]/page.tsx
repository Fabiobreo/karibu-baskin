import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import AdminGironeWorkspaceClient from "@/components/admin/AdminGironeWorkspaceClient";
import { generateGroupSlug } from "@/lib/slugUtils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Workspace Girone | Admin" };

type Params = { params: Promise<{ groupId: string }> };

export default async function AdminGironeWorkspacePage({ params }: Params) {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.appRole, "COACH")) {
    redirect("/admin/login");
  }
  const { groupId } = await params;

  // Risolvi per slug o per id (cuid legacy)
  const group = await prisma.group.findFirst({
    where: { OR: [{ slug: groupId }, { id: groupId }] },
    include: {
      competitiveTeams: {
        include: {
          competitiveTeam: { select: { id: true, name: true, season: true, color: true } },
        },
      },
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
          teamId: true,
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
      groupTeams: {
        include: {
          opposingTeam: { select: { id: true, name: true, slug: true, city: true } },
        },
      },
    },
  });
  if (!group) notFound();

  // Backfill slug per gironi legacy creati prima dell'introduzione del campo
  if (!group.slug) {
    const newSlug = await generateGroupSlug(group.name, group.season);
    if (newSlug) {
      await prisma.group.update({ where: { id: group.id }, data: { slug: newSlug } });
      group.slug = newSlug;
    }
  }

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
      select: {
        id: true,
        name: true,
        season: true,
        championship: true,
        competitiveTeams: { select: { competitiveTeamId: true } },
      },
    }),
  ]);

  return (
    <AdminGironeWorkspaceClient
      group={{
        id: group.id,
        name: group.name,
        season: group.season,
        championship: group.championship,
        ourTeams: group.competitiveTeams.map((gct) => gct.competitiveTeam),
      }}
      ourMatches={group.matches.map((m) => ({
        ...m,
        date: m.date.toISOString(),
      }))}
      groupMatches={group.groupMatches.map((gm) => ({
        ...gm,
        date: gm.date ? gm.date.toISOString() : null,
      }))}
      explicitTeams={group.groupTeams.map((gt) => gt.opposingTeam)}
      allOpponents={opponents}
      ourTeamsCatalog={teams}
      allGroups={allGroups.map((g) => ({
        id: g.id,
        name: g.name,
        season: g.season,
        championship: g.championship,
        competitiveTeamIds: g.competitiveTeams.map((c) => c.competitiveTeamId),
      }))}
    />
  );
}
