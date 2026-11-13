import { prisma } from "@/lib/db";
import { romeDay } from "@/lib/notifications/pushStatTypes";
import { PREDICTABLE_MATCH_WHERE } from "@/lib/games/loadPredictions";
import { QUIZ_GAME_PREFIX } from "@/lib/games/gameStats";

/**
 * Giochi in `/admin/metriche` (UX-61): solo per curiosità, per sapere se
 * piacciono. Non sono un obiettivo e non decidono se un gioco resta.
 */

/** Partite col pronostico mostrate nella tessera. */
const RECENT_MATCHES = 3;

export interface GameMetrics {
  /** Partite dei quiz completate nel periodo, tutti i quiz insieme. */
  quizPlays: number;
  /** Partite completate nel periodo per quiz (id del quiz → partite, UX-67). */
  quizPlaysById: Record<string, number>;
  /** Quanti tesserati hanno almeno una migliore partita salvata. */
  quizPlayers: number;
  /** Ultime partite iniziate con il pronostico, dalla più recente. */
  predictions: { title: string; date: Date; count: number }[];
}

export async function loadGameMetrics(windowDays: number, now = new Date()): Promise<GameMetrics> {
  const from = romeDay(new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000));
  const [plays, players, matches] = await Promise.all([
    prisma.gameDailyStat.groupBy({
      by: ["game"],
      where: { game: { startsWith: QUIZ_GAME_PREFIX }, day: { gte: from } },
      _sum: { plays: true },
    }),
    prisma.quizBest.groupBy({ by: ["userId"] }),
    prisma.match.findMany({
      where: { ...PREDICTABLE_MATCH_WHERE, date: { lte: now } },
      orderBy: { date: "desc" },
      take: RECENT_MATCHES,
      select: {
        date: true,
        team: { select: { name: true } },
        opponent: { select: { name: true } },
        _count: { select: { predictions: true } },
      },
    }),
  ]);
  const quizPlaysById = Object.fromEntries(
    plays.map((g) => [g.game.slice(QUIZ_GAME_PREFIX.length), g._sum.plays ?? 0])
  );
  return {
    quizPlays: Object.values(quizPlaysById).reduce((a, b) => a + b, 0),
    quizPlaysById,
    quizPlayers: players.length,
    predictions: matches.map((m) => ({
      title: `${m.team.name} – ${m.opponent?.name ?? ""}`,
      date: m.date,
      count: m._count.predictions,
    })),
  };
}
