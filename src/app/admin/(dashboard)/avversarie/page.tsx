import { requireAdminPage } from "@/lib/adminAccess";
import { prisma } from "@/lib/db";
import AdminAvversarieClient from "@/components/admin/AdminAvversarieClient";
import PageHeader from "@/components/common/PageHeader";
import type { Metadata } from "next";
import { OPPONENT_SHEET_SELECT, type OpponentMatchNote } from "@/lib/matches/opponentSheet";
import type { OpponentProfile } from "@/lib/schemas/match";

export const metadata: Metadata = { title: "Squadre avversarie | Admin" };
export const revalidate = 30;

export default async function AdminAvversariePage() {
  await requireAdminPage("/admin/avversarie");
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
  return (
    <>
      <PageHeader
        title="Squadre avversarie"
        subtitle="Anagrafica delle squadre che incontriamo nei campionati e nei tornei."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Avversarie" }]}
      />
      <AdminAvversarieClient
        initialOpponents={opponents.map((o) => ({
          ...o,
          scoutingProfile: o.scoutingProfile as OpponentProfile,
        }))}
        matchNotes={matchNotes}
      />
    </>
  );
}
