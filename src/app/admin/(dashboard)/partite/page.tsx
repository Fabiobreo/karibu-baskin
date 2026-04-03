import { prisma } from "@/lib/db";
import AdminPartiteClient from "@/components/AdminPartiteClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gestione Partite | Admin" };
export const revalidate = 0;

export default async function AdminPartitePage() {
  const [teams, opposingTeams, matches] = await Promise.all([
    prisma.competitiveTeam.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      select: { id: true, name: true, season: true, color: true },
    }),
    prisma.opposingTeam.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: true },
    }),
    prisma.officialMatch.findMany({
      orderBy: { date: "desc" },
      include: {
        team: { select: { id: true, name: true, season: true, color: true } },
        opponent: { select: { id: true, name: true, city: true } },
        _count: { select: { playerStats: true } },
      },
    }),
  ]);

  return <AdminPartiteClient teams={teams} opposingTeams={opposingTeams} matches={matches} />;
}
