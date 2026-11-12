import { prisma } from "@/lib/db";
import { romeDay } from "@/lib/notifications/pushStatTypes";
import { PREDICTABLE_MATCH_WHERE } from "@/lib/games/loadPredictions";

/**
 * Giochi in `/admin/metriche` (UX-61): solo per curiosità, per sapere se
 * piacciono. Non sono un obiettivo e non decidono se un gioco resta.
 */

/** Partite col pronostico mostrate nella tessera. */
const RECENT_MATCHES = 3;

export interface GameMetrics {
  /** Partite del quiz completate nel periodo. */
  quizPlays: number;
  /** Quanti tesserati hanno la loro migliore partita salvata. */
  quizPlayers: number;
  /** Ultime partite iniziate con il pronostico, dalla più recente. */
  predictions: { title: string; date: Date; count: number }[];
}

export async function loadGameMetrics(windowDays: number, now = new Date()): Promise<GameMetrics> {
  const from = romeDay(new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000));
  const [plays, quizPlayers, matches] = await Promise.all([
    prisma.gameDailyStat.aggregate({
      where: { game: "quiz", day: { gte: from } },
      _sum: { plays: true },
    }),
    prisma.user.count({ where: { quizBest: { not: null } } }),
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
  return {
    quizPlays: plays._sum.plays ?? 0,
    quizPlayers,
    predictions: matches.map((m) => ({
      title: `${m.team.name} – ${m.opponent?.name ?? ""}`,
      date: m.date,
      count: m._count.predictions,
    })),
  };
}
