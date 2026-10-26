import { prisma } from "@/lib/db";
import { hasRole } from "@/lib/authRoles";
import { requireAdminPage } from "@/lib/adminAccess";
import AdminSquadreView from "@/components/admin/AdminSquadreView";
import PageHeader from "@/components/common/PageHeader";
import type { Metadata } from "next";
import { OPPONENT_SHEET_SELECT, type OpponentMatchNote } from "@/lib/matches/opponentSheet";
import type { OpponentProfile } from "@/lib/schemas/match";

export const metadata: Metadata = { title: "Squadre | Admin" };
export const revalidate = 30;

/** Le avversarie con la scheda dello staff e il diario delle note di partita. */
async function loadOpponents() {
  const [opponents, notes] = await Promise.all([
    prisma.opposingTeam.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        address: true,
        website: true,
        colors: true,
        imageUrl: true,
        ...OPPONENT_SHEET_SELECT,
      },
    }),
    // Il diario delle schede: le note scritte dopo le partite.
    prisma.matchOpponentNote.findMany({
      select: {
        matchId: true,
        note: true,
        match: {
          select: {
            opponentId: true,
            date: true,
            ourScore: true,
            theirScore: true,
            team: { select: { name: true } },
          },
        },
      },
    }),
  ]);
  const matchNotes: Record<string, OpponentMatchNote[]> = {};
  for (const { matchId, note, match } of notes) {
    if (!match.opponentId) continue;
    (matchNotes[match.opponentId] ??= []).push({
      matchId,
      note,
      date: match.date,
      teamName: match.team.name,
      ourScore: match.ourScore,
      theirScore: match.theirScore,
    });
  }
  return {
    initialOpponents: opponents.map((o) => ({
      ...o,
      scoutingProfile: o.scoutingProfile as OpponentProfile,
    })),
    matchNotes,
  };
}

export default async function AdminSquadrePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // Chi non è admin (allenatore, dirigente) qui legge soltanto.
  const { role, readOnly } = await requireAdminPage("/admin/squadre");
  const { tab } = await searchParams;
  const [allTeams, seasons, opponents] = await Promise.all([
    prisma.competitiveTeam.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { memberships: true, matches: true } },
      },
    }),
    prisma.season.findMany(),
    // La scheda delle avversarie è dello staff: al dirigente non arriva nemmeno nel payload.
    readOnly ? undefined : loadOpponents(),
  ]);
  // La Karibu di stagione nasce da sola e non è una tessera come le altre: qui
  // lo staff decide solo se in quella stagione gioca il campionato.
  const teams = allTeams.filter((t) => !t.isMixed);
  const clubTeams = allTeams.filter((t) => t.isMixed);

  return (
    <>
      <PageHeader
        title="Squadre"
        subtitle={
          readOnly
            ? "Le squadre del club, stagione per stagione."
            : "Le squadre del club, stagione per stagione, e quelle che incontriamo."
        }
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Squadre" }]}
      />
      <AdminSquadreView
        initialSection={tab === "avversarie" ? "avversarie" : "nostre"}
        ours={{
          teams,
          clubTeams,
          seasons,
          isAdmin: hasRole(role, "ADMIN"),
          readOnly,
        }}
        opponents={opponents}
      />
    </>
  );
}
