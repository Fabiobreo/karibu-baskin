import { prisma } from "@/lib/db";
import { reconcilePlayerBadges } from "@/lib/rating/badgeService";

/** Ricalcola i badge di chi ha statistiche in una partita (dopo un cambio di risultato). */
export async function reconcileMatchBadges(matchId: string, notify: boolean): Promise<void> {
  const players = await prisma.playerMatchStats.findMany({
    where: { matchId },
    select: { userId: true, childId: true },
  });
  await Promise.all(
    players.map((s) => {
      if (s.userId) return reconcilePlayerBadges({ userId: s.userId }, { notify });
      if (s.childId) return reconcilePlayerBadges({ childId: s.childId }, { notify });
      return null;
    })
  );
}
