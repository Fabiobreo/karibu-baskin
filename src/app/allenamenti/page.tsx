import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/authjs";
import { isMemberRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import { Container, Typography } from "@mui/material";
import AllenamentiClient from "@/components/training/AllenamentiClient";
import { parseTeamsData } from "@/lib/schemas";
import type { Metadata } from "next";
import {
  isSeasonLabel,
  seasonsBetween,
  trainingSeasonOf,
  trainingSeasonRange,
} from "@/lib/trainingList";
import { sessionEndDate } from "@/lib/dateUtils";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Allenamenti",
  description:
    "Tutti gli allenamenti del Karibu Baskin di Montecchio Maggiore: date, orari e iscrizione online.",
  path: "/allenamenti",
});

export const revalidate = 0;

export default async function AllenamentiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const t = await getTranslations("nav");
  const now = new Date();
  const userSession = await auth();
  const userId = userSession?.user?.id ?? null;
  const isStaff = userSession?.user?.appRole === "COACH" || userSession?.user?.appRole === "ADMIN";
  // Le squadre contengono i nominativi degli atleti: solo per i tesserati.
  const isMember = isMemberRole(userSession?.user?.appRole);

  // Prossimi: sempre tutti. Passati: una stagione alla volta (?stagione=2025-26),
  // cosi' la pagina non carica mai tutto lo storico insieme.
  const currentSeason = trainingSeasonOf(now);
  const { stagione } = await searchParams;
  const season = isSeasonLabel(stagione) ? stagione : currentSeason;
  const range = trainingSeasonRange(season);
  // Un allenamento puo' essere ancora in corso: si prende qualche ora indietro
  // e si divide sotto con l'orario di fine vero.
  const activeFrom = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  const sessionInclude = {
    _count: { select: { registrations: true } },
    restrictTeam: { select: { id: true, name: true, color: true } },
  } as const;

  const [activeRaw, pastRaw, firstTraining] = await Promise.all([
    prisma.trainingSession.findMany({
      where: { date: { gte: activeFrom } },
      orderBy: { date: "asc" },
      include: sessionInclude,
    }),
    prisma.trainingSession.findMany({
      where: { date: { gte: range.start, lt: range.end < now ? range.end : now } },
      orderBy: { date: "desc" },
      include: {
        ...sessionInclude,
        matchResults: {
          select: { matchup: true, scoreA: true, scoreB: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.trainingSession.findFirst({ orderBy: { date: "asc" }, select: { date: true } }),
  ]);

  const withTeams = <T extends { teams: unknown }>(s: T) => ({
    ...s,
    teams: isMember ? parseTeamsData(s.teams) : null,
  });
  const endOf = (s: { date: Date; endTime: Date | null }) => sessionEndDate(s.date, s.endTime);

  const active = activeRaw.map(withTeams);
  const inCorso = active.filter((s) => now >= s.date && now <= endOf(s));
  const upcoming = active.filter((s) => s.date > now);
  const pastSessions = pastRaw.filter((s) => endOf(s) < now);
  const pastIds = pastSessions.map((s) => s.id);
  const activeIds = [...inCorso, ...upcoming].map((s) => s.id);

  const [presentBySession, activeRegs, myPastRegs] = await Promise.all([
    pastIds.length > 0
      ? prisma.registration.groupBy({
          by: ["sessionId"],
          where: { sessionId: { in: pastIds }, attended: true },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    userId && activeIds.length > 0
      ? prisma.registration.findMany({
          where: { userId, sessionId: { in: activeIds } },
          select: { id: true, sessionId: true },
        })
      : Promise.resolve([]),
    // "C'eri": iscritto e non segnato assente (chi non e' stato segnato conta).
    userId && pastIds.length > 0
      ? prisma.registration.findMany({
          where: { userId, sessionId: { in: pastIds }, NOT: { attended: false } },
          select: { sessionId: true },
        })
      : Promise.resolve([]),
  ]);

  const presentCount = new Map(presentBySession.map((r) => [r.sessionId, r._count._all]));
  const mine = new Set(myPastRegs.map((r) => r.sessionId));
  const past = pastSessions.map(({ matchResults, ...s }) => ({
    ...withTeams(s),
    results: matchResults,
    presentCount: presentCount.get(s.id) ?? 0,
    wasThere: mine.has(s.id),
  }));

  const seasons = seasonsBetween(
    firstTraining ? trainingSeasonOf(firstTraining.date) : currentSeason,
    currentSeason
  );
  // Una stagione chiesta a mano fuori elenco resta selezionabile.
  if (!seasons.includes(season)) seasons.push(season);
  seasons.sort((a, b) => b.localeCompare(a));

  return (
    <>
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <Typography variant="h4" component="h1" fontWeight={800} sx={{ mb: 2 }}>
          {t("trainings")}
        </Typography>
        <AllenamentiClient
          inCorso={inCorso}
          upcoming={upcoming}
          past={past}
          seasons={seasons}
          season={season}
          attendedCount={userId ? mine.size : null}
          registeredSessionIds={activeRegs.map((r) => r.sessionId)}
          registrationIdBySession={Object.fromEntries(activeRegs.map((r) => [r.sessionId, r.id]))}
          isStaff={isStaff}
        />
      </Container>
    </>
  );
}
