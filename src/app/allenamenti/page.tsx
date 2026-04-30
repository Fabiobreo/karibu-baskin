import { auth } from "@/lib/authjs";
import { prisma } from "@/lib/db";
import { Container } from "@mui/material";
import SiteHeader from "@/components/SiteHeader";
import AllenamentiClient from "@/components/AllenamentiClient";
import type { TeamsData } from "@/components/TeamDisplay";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Allenamenti | Karibu Baskin" };
export const revalidate = 0;

function getSeasonStart(): Date {
  const now = new Date();
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 7, 1);
}

export default async function AllenamentiPage() {
  const now = new Date();
  const userSession = await auth();
  const userId = userSession?.user?.id ?? null;
  const isStaff = userSession?.user?.appRole === "COACH" || userSession?.user?.appRole === "ADMIN";

  const rawSessions = await prisma.trainingSession.findMany({
    orderBy: { date: "asc" },
    include: {
      _count: { select: { registrations: true } },
      restrictTeam: { select: { id: true, name: true, color: true } },
    },
  });

  const sessions = rawSessions.map((s) => ({
    ...s,
    teams: s.teams as unknown as TeamsData | null,
  }));

  const inCorso = sessions.filter((s) => {
    const start = new Date(s.date);
    const end = s.endTime
      ? new Date(s.endTime)
      : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return now >= start && now <= end;
  });

  const upcoming = sessions.filter((s) => new Date(s.date) > now);

  const past = sessions
    .filter((s) => {
      const end = s.endTime
        ? new Date(s.endTime)
        : new Date(new Date(s.date).getTime() + 2 * 60 * 60 * 1000);
      return end < now;
    })
    .reverse();

  let registeredSessionIds: string[] = [];
  // mappa sessionId → registrationId (per trovare la squadra dell'utente)
  let registrationIdBySession: Record<string, string> = {};
  let seasonAttended = 0;
  let seasonTotal = 0;

  if (userId) {
    const seasonStart = getSeasonStart();

    seasonTotal = sessions.filter((s) => {
      const d = new Date(s.date);
      return d >= seasonStart && d < now;
    }).length;

    // Sessioni attive (in corso + prossime) — query per ID esatto, senza finestra temporale
    const activeSessionIds = [...inCorso, ...upcoming].map((s) => s.id);

    const [activeRegs, pastRegs] = await Promise.all([
      activeSessionIds.length > 0
        ? prisma.registration.findMany({
            where: { userId, sessionId: { in: activeSessionIds } },
            select: { id: true, sessionId: true },
          })
        : Promise.resolve([]),
      prisma.registration.findMany({
        where: { userId, session: { date: { gte: seasonStart, lt: now } } },
        select: { sessionId: true },
      }),
    ]);

    registeredSessionIds = activeRegs.map((r) => r.sessionId);
    registrationIdBySession = Object.fromEntries(activeRegs.map((r) => [r.sessionId, r.id]));
    seasonAttended = pastRegs.length;
  }

  return (
    <>
      <SiteHeader />
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <AllenamentiClient
          inCorso={inCorso}
          upcoming={upcoming}
          past={past}
          registeredSessionIds={registeredSessionIds}
          registrationIdBySession={registrationIdBySession}
          seasonAttended={seasonAttended}
          seasonTotal={seasonTotal}
          isLoggedIn={!!userId}
          isStaff={isStaff}
        />
      </Container>
    </>
  );
}
