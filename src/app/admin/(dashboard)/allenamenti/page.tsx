import { prisma } from "@/lib/db";
import { Box, Typography } from "@mui/material";
import { parseTeamsData } from "@/lib/schemas/session";
import AdminAllenamentiClient from "@/components/AdminAllenamentiClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Allenamenti da gestire | Admin" };
export const revalidate = 0;

export default async function AdminAllenamentiPage() {
  const now = new Date();

  const rawSessions = await prisma.trainingSession.findMany({
    where: { date: { lt: now }, managedAt: null },
    orderBy: { date: "desc" },
    include: {
      registrations: {
        select: { id: true, name: true, role: true, attended: true, registeredAsCoach: true },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
      matchResults: { select: { matchup: true } },
    },
  });

  const sessions = rawSessions.map((s) => {
    const teams = parseTeamsData(s.teams);
    const athleteRegs = s.registrations.filter((r) => !r.registeredAsCoach);
    const athleteCount = athleteRegs.length;
    const presentCount = athleteRegs.filter((r) => r.attended === true).length;
    const athletes = athleteRegs.map((r) => ({ id: r.id, name: r.name, role: r.role, attended: r.attended }));

    const hasThreeTeams = !!(teams?.teamC && teams.teamC.length > 0);
    const expectedResults = teams ? (hasThreeTeams ? 3 : 1) : 0;
    const savedMatchups = s.matchResults.filter((r) => r.matchup != null).length;
    return {
      id: s.id,
      title: s.title,
      date: s.date.toISOString(),
      dateSlug: s.dateSlug,
      athleteCount,
      presentCount,
      athletes,
      expectedResults,
      teams,
    };
  });

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
        Allenamenti da completare
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Sessioni concluse con risultati delle partite ancora mancanti.
      </Typography>
      <AdminAllenamentiClient sessions={sessions} />
    </Box>
  );
}
