import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/authjs";
import { hasRole } from "@/lib/authRoles";
import { prisma } from "@/lib/db";
import {
  buildTeamCallupContext,
  buildLoanPool,
  WINDOW_DAYS_FOR_PRESENCES,
} from "@/lib/matches/callupContext";
import { rosterTeamIds } from "@/lib/matches/mixedTeam";
import ConvocazioniClient from "@/components/matches/ConvocazioniClient";
import MatchQualitySection from "@/components/matches/MatchQualitySection";
import { computeMatchQuality } from "@/lib/matches/matchQuality";
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
      team: { select: { id: true, name: true, season: true, color: true, isMixed: true } },
      opponent: { select: { id: true, name: true, ratingMu: true } },
      opponentTeam: {
        select: { id: true, name: true, season: true, color: true, isMixed: true },
      },
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
    teamIsMixed: match.team.isMixed,
    matchId,
    now,
  });

  const awayContext = match.opponentTeam
    ? await buildTeamCallupContext({
        teamId: match.opponentTeam.id,
        teamName: match.opponentTeam.name,
        teamColor: match.opponentTeam.color,
        teamSeason: match.opponentTeam.season,
        teamIsMixed: match.opponentTeam.isMixed,
        matchId,
        now,
      })
    : null;

  // Pool prestiti: giocatori di altre squadre della stessa stagione, esclusi i
  // tesserati delle squadre che partecipano alla partita. Se gioca la Karibu
  // tutta la stagione è già tra i candidati, e il pool resta vuoto.
  const participantTeamIds = await rosterTeamIds(
    [match.team, match.opponentTeam].filter((t): t is NonNullable<typeof t> => !!t)
  );
  const loanPool = await buildLoanPool(match.team.season, participantTeamIds);

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
        loanPool={loanPool}
      />
    </>
  );
}
