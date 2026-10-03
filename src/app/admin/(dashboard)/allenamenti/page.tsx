import { prisma } from "@/lib/db";
import { parseTeamsData } from "@/lib/schemas";
import AdminTrainingsView, { type TrainingsSection } from "@/components/admin/AdminTrainingsView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Allenamenti | Admin" };
export const revalidate = 0;

// Quanti allenamenti conclusi mostrare: servono per correggere a posteriori,
// non come archivio (quello e' /allenamenti).
const CONCLUDED_LIMIT = 20;

const SECTIONS: TrainingsSection[] = ["prossimi", "da-completare", "conclusi"];

type Props = {
  searchParams: Promise<{ sezione?: string; apri?: string; modifica?: string }>;
};

export default async function AdminAllenamentiPage({ searchParams }: Props) {
  const now = new Date();
  const sp = await searchParams;

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
  const sessionFields = {
    id: true,
    title: true,
    date: true,
    endTime: true,
    location: true,
    dateSlug: true,
    teams: true,
    allowedRoles: true,
    restrictTeamId: true,
    openRoles: true,
    registrations: registrationsSelect,
  } as const;
  const pastFields = {
    ...sessionFields,
    // Solo i punteggi: servono per precompilare le partitelle.
    matchResults: { select: { id: true, matchup: true, scoreA: true, scoreB: true } },
  } as const;

  // Le tre liste sono indipendenti: in parallelo (Neon a freddo).
  const [toCompleteRaw, concludedRaw, upcomingRaw] = await Promise.all([
    prisma.trainingSession.findMany({
      where: { date: { lt: now }, managedAt: null },
      orderBy: { date: "desc" },
      select: pastFields,
    }),
    prisma.trainingSession.findMany({
      where: { date: { lt: now }, managedAt: { not: null } },
      orderBy: { date: "desc" },
      take: CONCLUDED_LIMIT,
      select: pastFields,
    }),
    prisma.trainingSession.findMany({
      where: { date: { gt: now } },
      orderBy: { date: "asc" },
      select: { ...sessionFields, registrationOpen: true, registrationOpenedAt: true },
    }),
  ]);

  const upcoming = upcomingRaw.map((s) => ({
    ...s,
    date: s.date.toISOString(),
    endTime: s.endTime?.toISOString() ?? null,
    registrationOpenedAt: s.registrationOpenedAt?.toISOString() ?? null,
    teams: parseTeamsData(s.teams),
  }));

  function toRow(s: (typeof toCompleteRaw)[number]) {
    const teams = parseTeamsData(s.teams);
    const athleteRegs = s.registrations.filter((r) => !r.registeredAsCoach);
    const hasThreeTeams = !!(teams?.teamC && teams.teamC.length > 0);
    return {
      id: s.id,
      title: s.title,
      date: s.date.toISOString(),
      endTime: s.endTime?.toISOString() ?? null,
      location: s.location,
      dateSlug: s.dateSlug,
      allowedRoles: s.allowedRoles,
      restrictTeamId: s.restrictTeamId,
      openRoles: s.openRoles,
      athleteCount: athleteRegs.length,
      presentCount: athleteRegs.filter((r) => r.attended === true).length,
      athletes: athleteRegs.map((r) => ({
        id: r.id,
        name: r.name,
        role: r.role,
        attended: r.attended,
      })),
      // Tutti, allenatori compresi: servono alla gestione iscritti per sapere
      // chi c'è già.
      registrations: s.registrations,
      expectedResults: teams ? (hasThreeTeams ? 3 : 1) : 0,
      results: s.matchResults,
      teams,
    };
  }
  const toComplete = toCompleteRaw.map(toRow);
  const concluded = concludedRaw.map(toRow);

  // Sezione iniziale: quella chiesta, oppure quella che contiene l'allenamento
  // da aprire, oppure "Da completare" se c'e' qualcosa da chiudere.
  const target = sp.apri ?? sp.modifica ?? null;
  const sectionOf = (id: string): TrainingsSection | null =>
    upcoming.some((s) => s.id === id)
      ? "prossimi"
      : toComplete.some((s) => s.id === id)
        ? "da-completare"
        : concluded.some((s) => s.id === id)
          ? "conclusi"
          : null;
  const requested = SECTIONS.find((x) => x === sp.sezione) ?? null;
  const initialSection: TrainingsSection =
    (target && sectionOf(target)) ||
    requested ||
    (toComplete.length > 0 ? "da-completare" : "prossimi");

  return (
    // L'intestazione la disegna la vista: il bottone "Nuovo allenamento" apre
    // un dialog suo e sta nello slot azione di PageHeader (UX-51).
    <AdminTrainingsView
      header={{
        title: "Allenamenti",
        subtitle:
          "Crea gli allenamenti, apri le iscrizioni, fai le squadre e, a fine allenamento, segna presenze e risultati.",
        breadcrumb: [{ label: "Dashboard", href: "/admin" }, { label: "Allenamenti" }],
      }}
      upcoming={upcoming}
      toComplete={toComplete}
      concluded={concluded}
      initialSection={initialSection}
      openId={sp.apri ?? null}
      editId={sp.modifica ?? null}
    />
  );
}
