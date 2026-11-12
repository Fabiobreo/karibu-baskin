import { prisma } from "@/lib/db";
import { reconcilePlayerBadges, type PlayerRef } from "@/lib/rating/badgeService";
import { isHistoricMatch } from "@/lib/matches/matchPhase";

/**
 * Traguardi di costanza dopo un salvataggio di presenze (UX-59): ricalcola i
 * traguardi dei presenti di un allenamento. Un'assenza non sblocca niente,
 * quindi gli altri non si guardano. Per un allenamento di oltre un mese fa
 * (storico inserito dallo staff) nessun avviso, come per le partite.
 *
 * I traguardi di un figlio con un account sono dell'account (`@/lib/person`).
 */
export async function reconcileTrainingBadges(
  sessionId: string,
  now: number = Date.now()
): Promise<void> {
  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: {
      date: true,
      registrations: {
        where: { attended: true },
        select: { userId: true, childId: true, child: { select: { userId: true } } },
      },
    },
  });
  if (!session) return;
  const notify = !isHistoricMatch(session.date, now);

  const refs = new Map<string, PlayerRef>();
  for (const r of session.registrations) {
    const userId = r.userId ?? r.child?.userId ?? null;
    if (userId) refs.set(`u:${userId}`, { userId });
    else if (r.childId) refs.set(`c:${r.childId}`, { childId: r.childId });
  }
  // In fila: ogni ricalcolo legge tutti gli allenamenti con presenze, e in
  // parallelo per venti persone si prenderebbero tutte le connessioni.
  for (const ref of refs.values()) {
    await reconcilePlayerBadges(ref, { notify }).catch((err) =>
      console.error("[badges] allenamento", sessionId, err)
    );
  }
}
