import { prisma } from "@/lib/db";
import AdminPartiteClient from "@/components/AdminPartiteClient";
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
        group: { select: { id: true, name: true } },
        _count: { select: { playerStats: true } },
      },
    }),
    prisma.group.findMany({
      orderBy: [{ season: "desc" }, { name: "asc" }],
      include: {
        team: { select: { id: true, name: true, color: true } },
        _count: { select: { matches: true } },
      },
    }),
  ]);

  return <AdminPartiteClient teams={teams} opposingTeams={opposingTeams} matches={matches} groups={groups} />;
}
