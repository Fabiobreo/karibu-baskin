import { prisma } from "@/lib/db";
import AdminPartiteClient from "@/components/admin/AdminPartiteClient";
import { computeMatchCoverageBatch, type MatchCoverage } from "@/lib/matches/matchCoverage";
import { ensureClubTeam } from "@/lib/matches/mixedTeam";
import { getCurrentSeasonLabel } from "@/lib/season/activeSeason";
import { auth } from "@/lib/authjs";
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/adminAccess";

export const metadata: Metadata = { title: "Partite | Admin" };
export const revalidate = 30;

export default async function AdminPartitePage() {
  const { readOnly } = await requireAdminPage("/admin/partite");
  // La Karibu della stagione in corso c'è sempre: il form la propone per
  // amichevoli e tornei. Crearla è una scrittura: non la fa partire chi legge.
  if (!readOnly) await ensureClubTeam(await getCurrentSeasonLabel());

  const [session, teams, opposingTeams, matches, groups] = await Promise.all([
    auth(),
    prisma.competitiveTeam.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      select: { id: true, name: true, season: true, color: true, isMixed: true, playsLeague: true },
    }),
    prisma.opposingTeam.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: true },
    }),
    prisma.match.findMany({
      orderBy: { date: "desc" },
      include: {
        team: { select: { id: true, name: true, season: true, color: true } },
        opponent: { select: { id: true, name: true, city: true, ratingMu: true } },
        opponentTeam: { select: { id: true, name: true, color: true } },
        group: { select: { id: true, name: true } },
        _count: { select: { playerStats: true, callups: true } },
      },
      // opponentProfile è incluso automaticamente (non è una relazione, è un campo Json)
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

  // Il livello stimato dell'avversaria e la sua scheda sono dello staff: a chi
  // legge soltanto non arrivano nemmeno nel payload.
  const visibleMatches = readOnly
    ? matches.map((m) => ({
        ...m,
        opponentProfile: null,
        opponent: m.opponent && { ...m.opponent, ratingMu: null },
      }))
    : matches;

  return (
    // L'intestazione la disegna il client: "Nuova partita" apre un suo dialog
    // e sta nello slot azione di PageHeader (UX-51).
    <AdminPartiteClient
      header={{
        title: "Partite",
        subtitle: readOnly
          ? "Calendario delle partite ufficiali e risultati."
          : "Calendario delle partite ufficiali, convocazioni e statistiche.",
        breadcrumb: [{ label: "Dashboard", href: "/admin" }, { label: "Partite" }],
      }}
      teams={teams}
      opposingTeams={opposingTeams}
      matches={visibleMatches}
      groups={groupsForForm}
      groupMatches={groupMatches}
      coverages={coverages}
      isAdmin={session?.user?.appRole === "ADMIN"}
      readOnly={readOnly}
    />
  );
}
