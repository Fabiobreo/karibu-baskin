import { prisma } from "@/lib/db";
import { parseTeamsData } from "@/lib/schemas";
import HomeSessionsSection from "@/components/training/HomeSessionsSection";
import type { SessionWithCount } from "@/components/training/SessionCard";

// Finestra della home. Oltre questa soglia una sessione non è "il prossimo
// allenamento" per chi visita: in estate l'unica data futura può essere a
// nove mesi, e una card "Tra 271 giorni · 0 iscritti" come prima cosa sotto
// la hero dice che la squadra è ferma. Fuori finestra la sezione mostra un
// invito a scriverci (vedi HomeSessionsSection). Il calendario resta completo.
const HOME_WINDOW_DAYS = 45;

interface HomeSessionsProps {
  userId: string | null;
  isMember: boolean;
  isStaff: boolean;
}

/**
 * Sezione allenamenti della home — Server Component con le sue query, così la
 * pagina la avvolge in `<Suspense>` e non aspetta il database per il resto.
 */
export default async function HomeSessions({ userId, isMember, isStaff }: HomeSessionsProps) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = new Date(startOfToday.getTime() + HOME_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const rawSessions = await prisma.trainingSession.findMany({
    where: { date: { gte: startOfToday, lte: horizon } },
    orderBy: { date: "asc" },
    include: {
      _count: { select: { registrations: true } },
      restrictTeam: { select: { id: true, name: true, color: true } },
    },
  });

  // Le squadre generate contengono nome, ruolo e genere di ogni atleta, minori
  // compresi: nella home pubblica non devono finire nel payload della pagina.
  const sessions = rawSessions.map((s) => ({
    ...s,
    teams: isMember ? parseTeamsData(s.teams) : null,
  })) satisfies SessionWithCount[];

  const inCorso = sessions.filter((s) => {
    const start = new Date(s.date);
    const end = s.endTime ? new Date(s.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return now >= start && now <= end;
  });

  const allUpcoming = sessions.filter((s) => new Date(s.date) > now);

  // Mostra 2 prossimi se stesso giorno, altrimenti solo 1
  const first = allUpcoming[0] ?? null;
  const second = allUpcoming[1] ?? null;
  const sameDay =
    first && second && new Date(first.date).toDateString() === new Date(second.date).toDateString();
  const upcoming = sameDay ? [first, second] : first ? [first] : [];

  // Recupera le iscrizioni dell'utente per le sessioni visibili
  let registrationIdBySession: Record<string, string> = {};
  const visibleIds = [...inCorso, ...upcoming].map((s) => s.id);
  if (userId && visibleIds.length > 0) {
    const regs = await prisma.registration.findMany({
      where: { userId, sessionId: { in: visibleIds } },
      select: { id: true, sessionId: true },
    });
    registrationIdBySession = Object.fromEntries(regs.map((r) => [r.sessionId, r.id]));
  }

  return (
    <HomeSessionsSection
      inCorso={inCorso}
      upcoming={upcoming}
      registrationIdBySession={registrationIdBySession}
      isStaff={isStaff}
    />
  );
}
