import { prisma } from "@/lib/db";
import { parseTeamsData } from "@/lib/schemas";
import AdminAllenamentiClient from "@/components/admin/AdminAllenamentiClient";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Alert } from "@mui/material";
import MuiLink from "@mui/material/Link";
import Link from "next/link";
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
    const athletes = athleteRegs.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      attended: r.attended,
    }));

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
    <>
      <AdminPageHeader
        title="Allenamenti da completare"
        subtitle="Sessioni concluse con risultati delle partite ancora mancanti."
        breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Allenamenti" }]}
      />
      <Alert severity="info" sx={{ mb: 3 }}>
        Qui concludi gli allenamenti passati: presenze e risultati delle partitelle. Per creare o
        modificare gli allenamenti usa il{" "}
        <MuiLink component={Link} href="/calendario" fontWeight={700}>
          Calendario
        </MuiLink>{" "}
        o la pagina{" "}
        <MuiLink component={Link} href="/allenamenti" fontWeight={700}>
          Allenamenti
        </MuiLink>
        .
      </Alert>
      <AdminAllenamentiClient sessions={sessions} />
    </>
  );
}
