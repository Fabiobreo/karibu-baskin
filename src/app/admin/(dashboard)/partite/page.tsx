import { prisma } from "@/lib/db";
import AdminPartiteClient from "@/components/AdminPartiteClient";
import AdminPageHeader from "@/components/AdminPageHeader";
import { computeMatchCoverageBatch, type MatchCoverage } from "@/lib/matchCoverage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gestione Partite | Admin" };
export const revalidate = 30;

export default async function AdminPartitePage() {
  const [teams, opposingTeams, matches, groups] = await Promise.all([
    prisma.competitiveTeam.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      select: { id: true, name: true, season: true, color: true },
    }),
    prisma.opposingTeam.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: true },
    }),
    prisma.match.findMany({
      orderBy: { date: "desc" },
      include: {
        team: { select: { id: true, name: true, season: true, color: true } },
        opponent: { select: { id: true, name: true, city: true } },
        opponentTeam: { select: { id: true, name: true, color: true } },
        group: { select: { id: true, name: true } },
        _count: { select: { playerStats: true } },
      },
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

  const groupsForForm = groups.map((g) => ({
    id: g.id,
    name: g.name,
    season: g.season,
    championship: g.championship,
    competitiveTeamIds: g.competitiveTeams.map((c) => c.competitiveTeamId),
  }));

  // GroupMatch contestuali: tutte le partite tra terzi dei gironi in cui giochiamo
  const groupIds = Array.from(new Set(matches.map((m) => m.groupId).filter(Boolean))) as string[];
  const groupMatches =
    groupIds.length === 0
      ? []
      : await prisma.groupMatch.findMany({
          where: { groupId: { in: groupIds } },
          orderBy: [{ matchday: "asc" }, { date: "asc" }],
          select: {
            id: true,
            groupId: true,
            matchday: true,
            date: true,
            homeScore: true,
            awayScore: true,
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } },
          },
        });

  // Copertura ruoli per partite future: alert se sotto soglia
  const now = new Date();
  const futureMatchIds = matches.filter((m) => m.date > now).map((m) => m.id);
  const coverageMap = await computeMatchCoverageBatch(futureMatchIds);
  const coverages: Record<string, MatchCoverage> = {};
  for (const [id, cov] of coverageMap) coverages[id] = cov;

  return (
    <>
      <AdminPageHeader
        title="Gestione Partite"
        subtitle="Calendario delle partite ufficiali, convocazioni e statistiche."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Partite" }]}
      />
      <AdminPartiteClient
        teams={teams}
        opposingTeams={opposingTeams}
        matches={matches}
        groups={groupsForForm}
        groupMatches={groupMatches}
        coverages={coverages}
      />
    </>
  );
}
