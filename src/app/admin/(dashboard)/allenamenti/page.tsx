import { prisma } from "@/lib/db";
import { parseTeamsData } from "@/lib/schemas";
import AdminAllenamentiClient from "@/components/admin/AdminAllenamentiClient";
import AdminUpcomingSessions from "@/components/admin/AdminUpcomingSessions";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Typography } from "@mui/material";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Allenamenti da completare | Admin" };
export const revalidate = 0;

export default async function AdminAllenamentiPage() {
  const now = new Date();

  const registrationsSelect = {
    select: {
      id: true,
      name: true,
      role: true,
      attended: true,
      registeredAsCoach: true,
      userId: true,
      childId: true,
    },
    orderBy: [{ role: "asc" as const }, { createdAt: "asc" as const }],
  };

  // Le due liste sono indipendenti: in parallelo (Neon a freddo).
  const [rawSessions, upcomingSessions] = await Promise.all([
    prisma.trainingSession.findMany({
      where: { date: { lt: now }, managedAt: null },
      orderBy: { date: "desc" },
      include: {
        registrations: registrationsSelect,
        // Solo i punteggi: servono per precompilare le partitelle.
        matchResults: { select: { id: true, matchup: true, scoreA: true, scoreB: true } },
      },
    }),
    // Gli stessi "prossimi" di /allenamenti (data futura): lo staff iscrive da
    // qui chi non è riuscito a farlo da solo.
    prisma.trainingSession.findMany({
      where: { date: { gt: now } },
      orderBy: { date: "asc" },
      select: {
        id: true,
        title: true,
        date: true,
        dateSlug: true,
        registrations: registrationsSelect,
      },
    }),
  ]);

  const upcoming = upcomingSessions.map((s) => ({ ...s, date: s.date.toISOString() }));

  const sessions = rawSessions.map((s) => {
    const teams = parseTeamsData(s.teams);
    const athleteRegs = s.registrations.filter((r) => !r.registeredAsCoach);
    const athleteCount = athleteRegs.length;
    const presentCount = athleteRegs.filter((r) => r.attended === true).length;
    const athletes = athleteRegs.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      attended: r.attended,
    }));

    const hasThreeTeams = !!(teams?.teamC && teams.teamC.length > 0);
    const expectedResults = teams ? (hasThreeTeams ? 3 : 1) : 0;
    return {
      id: s.id,
      title: s.title,
      date: s.date.toISOString(),
      dateSlug: s.dateSlug,
      athleteCount,
      presentCount,
      athletes,
      // Tutti, allenatori compresi: servono alla gestione iscritti per sapere
      // chi c'è già.
      registrations: s.registrations,
      expectedResults,
      results: s.matchResults,
      teams,
    };
  });

  return (
    <>
      <AdminPageHeader
        title="Allenamenti da completare"
        subtitle="Iscrivi chi non ci è riuscito ai prossimi allenamenti e concludi quelli passati. Gli allenamenti si creano dal Calendario."
        breadcrumb={[
          { label: "Dashboard", href: "/admin" },
          { label: "Allenamenti da completare" },
        ]}
      />
      <AdminUpcomingSessions sessions={upcoming} />
      {upcoming.length > 0 && (
        <Typography
          variant="overline"
          component="h2"
          fontWeight={800}
          color="text.secondary"
          sx={{ display: "block", letterSpacing: "0.1em", mb: 2 }}
        >
          Da completare · {sessions.length}
        </Typography>
      )}
      <AdminAllenamentiClient sessions={sessions} />
    </>
  );
}
