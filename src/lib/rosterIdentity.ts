import { prisma } from "@/lib/db";

/**
 * Chi è, in rosa, una persona che ha sia un account sia una scheda figlio
 * collegata (`Child.userId`).
 *
 * Sono la stessa persona e in una squadra ci stanno una volta sola. L'identità
 * che va in rosa è quella che ha lo storico sportivo: la scheda figlio, se ha
 * già squadre, convocazioni o statistiche (il ragazzo che giocava da "figlio" e
 * si è fatto l'account dopo), altrimenti l'account (le schede nate già
 * collegate sono solo il legame con i genitori). Così convocazioni e
 * statistiche continuano sullo stesso profilo invece di dividersi in due.
 */
export interface RosterIdentity {
  userId: string | null;
  childId: string | null;
  /** Con quale delle due identità va creata l'appartenenza alla squadra. */
  memberAs: "user" | "child";
}

const HISTORY = { teamMemberships: true, matchStats: true, callups: true } as const;

function hasHistory(count: { teamMemberships: number; matchStats: number; callups: number }) {
  return count.teamMemberships + count.matchStats + count.callups > 0;
}

export async function rosterIdentity(ref: {
  userId?: string | null;
  childId?: string | null;
}): Promise<RosterIdentity> {
  if (ref.userId) {
    const card = await prisma.child.findUnique({
      where: { userId: ref.userId },
      select: { id: true, _count: { select: HISTORY } },
    });
    if (!card) return { userId: ref.userId, childId: null, memberAs: "user" };
    return {
      userId: ref.userId,
      childId: card.id,
      memberAs: hasHistory(card._count) ? "child" : "user",
    };
  }
  const childId = ref.childId ?? null;
  if (!childId) return { userId: null, childId: null, memberAs: "user" };
  const card = await prisma.child.findUnique({
    where: { id: childId },
    select: { userId: true, _count: { select: HISTORY } },
  });
  if (!card?.userId) return { userId: null, childId, memberAs: "child" };
  return {
    userId: card.userId,
    childId,
    memberAs: hasHistory(card._count) ? "child" : "user",
  };
}
