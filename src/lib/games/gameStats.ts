import { prisma } from "@/lib/db";
import { romeDay } from "@/lib/notifications/pushStatTypes";

/**
 * Partite dei giochi completate (UX-61), per giorno e gioco. Come le visite
 * dalle condivisioni: si conta quante, mai chi. Solo per curiosità.
 */

/** Chiave del contatore di un quiz (UX-67): `quiz:<id del quiz>`. */
export const QUIZ_GAME_PREFIX = "quiz:";
export function quizGameKey(quizId: string): string {
  return `${QUIZ_GAME_PREFIX}${quizId}`;
}

export async function recordGamePlay(game: string, now = new Date()) {
  const day = romeDay(now);
  await prisma.gameDailyStat.upsert({
    where: { day_game: { day, game } },
    create: { day, game, plays: 1 },
    update: { plays: { increment: 1 } },
  });
}
