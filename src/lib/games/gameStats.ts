import { prisma } from "@/lib/db";
import { romeDay } from "@/lib/notifications/pushStatTypes";

/**
 * Partite dei giochi completate (UX-61), per giorno e gioco. Come le visite
 * dalle condivisioni: si conta quante, mai chi. Solo per curiosità.
 */
export const GAMES = ["quiz"] as const;
export type Game = (typeof GAMES)[number];

export async function recordGamePlay(game: Game, now = new Date()) {
  const day = romeDay(now);
  await prisma.gameDailyStat.upsert({
    where: { day_game: { day, game } },
    create: { day, game, plays: 1 },
    update: { plays: { increment: 1 } },
  });
}
