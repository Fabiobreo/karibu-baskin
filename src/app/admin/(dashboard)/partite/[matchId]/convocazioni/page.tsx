import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import { buildTeamCallupContext, WINDOW_DAYS_FOR_PRESENCES } from "@/lib/callupContext";
import ConvocazioniClient from "@/components/ConvocazioniClient";
import MatchQualitySection from "@/components/MatchQualitySection";
import { computeMatchQuality } from "@/lib/matchQuality";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Convocazioni | Admin" };

type Params = { params: Promise<{ matchId: string }> };

export default async function ConvocazioniPage({ params }: Params) {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.appRole, "COACH")) {
    redirect("/admin/login");
  }

  const { matchId } = await params;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      team: { select: { id: true, name: true, season: true, color: true } },
      opponent: { select: { id: true, name: true, ratingMu: true } },
      opponentTeam: { select: { id: true, name: true, season: true, color: true } },
      callups: {
        select: {
          userId: true,
          childId: true,
          user: { select: { ratingMu: true } },
          child: { select: { ratingMu: true } },
        },
      },
    },
  });
  if (!match) notFound();

  // Calcola qualità del match (solo per partite vs avversari esterni con rating)
  const callupMus = match.callups
    .map((c) => c.user?.ratingMu ?? c.child?.ratingMu)
    .filter((mu): mu is number => mu !== null && mu !== undefined);
  const matchQuality =
    match.opponentId && match.opponent?.ratingMu != null
      ? computeMatchQuality(callupMus, match.opponent.ratingMu)
      : null;

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_DAYS_FOR_PRESENCES * 24 * 60 * 60 * 1000);

  const homeContext = await buildTeamCallupContext({
    teamId: match.team.id,
    teamName: match.team.name,
    teamColor: match.team.color,
    teamSeason: match.team.season,
    matchId,
    now,
  });

  const awayContext = match.opponentTeam
    ? await buildTeamCallupContext({
        teamId: match.opponentTeam.id,
        teamName: match.opponentTeam.name,
        teamColor: match.opponentTeam.color,
        teamSeason: match.opponentTeam.season,
        matchId,
        now,
      })
    : null;

  // Numero di sessioni della finestra (uguale per entrambe le squadre, calcolato
  // sui training session della stagione; per ora una singola finestra globale).
  const windowEligibleSessions = await prisma.trainingSession.count({
    where: {
      date: { gte: windowStart, lt: now },
      managedAt: { not: null },
    },
  });

  const opponentLabel = match.opponent?.name ?? match.opponentTeam?.name ?? "Avversario";

  return (
    <>
      {matchQuality && match.opponent?.name && (
        <MatchQualitySection
          quality={matchQuality}
          opponentName={match.opponent.name}
          callupsWithRatingCount={callupMus.length}
        />
      )}
      <ConvocazioniClient
        matchId={matchId}
        matchLabel={`${match.team.name} vs ${opponentLabel}`}
        matchDateISO={match.date.toISOString()}
        windowEligibleSessions={windowEligibleSessions}
        teams={awayContext ? [homeContext, awayContext] : [homeContext]}
        opponentMu={match.opponent?.ratingMu ?? null}
      />
    </>
  );
}
