import { cache } from "react";
import { prisma } from "@/lib/db";
import { getCurrentSeason } from "@/lib/season/seasonUtils";
import {
  PREDICTION_OPENS_BEFORE_MS,
  predictionRecord,
  predictionTotals,
  predictionWindow,
  type PredictionRow,
  type PredictionTotals,
} from "@/lib/games/prediction";

/**
 * Letture del pronostico della partita (UX-61). Solo il pronostico di chi
 * guarda e i totali: nessuna funzione restituisce chi ha pronosticato cosa.
 */

/** Filtro Prisma delle partite col pronostico: contro un'avversaria, mai le amichevoli interne. */
export const PREDICTABLE_MATCH_WHERE = {
  opponentId: { not: null },
  opponentTeamId: null,
} as const;

export interface NextPredictionMatch {
  id: string;
  slug: string | null;
  date: Date;
  teamName: string;
  opponentName: string;
  isHome: boolean;
}

/** La prima partita con il pronostico aperto adesso (per la card di `/giochi`). */
export async function loadNextPredictionMatch(now: Date): Promise<NextPredictionMatch | null> {
  const m = await prisma.match.findFirst({
    where: {
      ...PREDICTABLE_MATCH_WHERE,
      date: { gt: now, lte: new Date(now.getTime() + PREDICTION_OPENS_BEFORE_MS) },
    },
    orderBy: { date: "asc" },
    select: {
      id: true,
      slug: true,
      date: true,
      isHome: true,
      team: { select: { name: true } },
      opponent: { select: { name: true } },
    },
  });
  if (!m) return null;
  return {
    id: m.id,
    slug: m.slug,
    date: m.date,
    isHome: m.isHome,
    teamName: m.team.name,
    opponentName: m.opponent?.name ?? "",
  };
}

/** Pronostico di chi guarda per una partita, o `null`. */
export async function loadOwnPrediction(
  matchId: string,
  userId: string
): Promise<PredictionRow | null> {
  return prisma.matchPrediction.findUnique({
    where: { matchId_userId: { matchId, userId } },
    select: { outcome: true, ourScore: true, theirScore: true },
  });
}

/** Totali di una partita: da chiedere solo dopo l'inizio (prima non si mostrano). */
export async function loadPredictionTotals(matchId: string): Promise<PredictionTotals> {
  const groups = await prisma.matchPrediction.groupBy({
    by: ["outcome"],
    where: { matchId },
    _count: { _all: true },
  });
  return predictionTotals(
    groups.flatMap((g) => Array.from({ length: g._count._all }, () => ({ outcome: g.outcome })))
  );
}

/**
 * Partite della home per cui chi guarda può ancora fare il pronostico e non
 * l'ha fatto ("Fai il tuo pronostico" sulla card). In cache per richiesta.
 */
export const loadPendingPredictions = cache(
  async (
    userId: string,
    matches: readonly {
      id: string;
      date: Date | string;
      opponentId: string | null;
      opponentTeamId: string | null;
    }[],
    now: number
  ): Promise<Set<string>> => {
    const open = matches.filter((m) => predictionWindow(m, now) === "open").map((m) => m.id);
    if (open.length === 0) return new Set();
    const done = await prisma.matchPrediction.findMany({
      where: { userId, matchId: { in: open } },
      select: { matchId: true },
    });
    const doneIds = new Set(done.map((d) => d.matchId));
    return new Set(open.filter((id) => !doneIds.has(id)));
  }
);

/** "Pronostici giusti in questa stagione: 7 su 10" (solo di chi guarda). */
export async function loadSeasonPredictionRecord(
  userId: string,
  season: string
): Promise<{ right: number; total: number }> {
  const rows = await prisma.matchPrediction.findMany({
    where: { userId },
    select: {
      outcome: true,
      ourScore: true,
      theirScore: true,
      match: { select: { date: true, ourScore: true, theirScore: true, result: true } },
    },
  });
  return predictionRecord(rows.filter((r) => getCurrentSeason(r.match.date) === season));
}
