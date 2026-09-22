import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Genitori (tutori) di un figlio senza account.
 *
 * Un figlio può avere più genitori, tutti con gli stessi poteri: iscriverlo,
 * dichiararne la disponibilità, rispondere agli eventi, modificarlo, ricevere
 * le sue notifiche. Il collegamento sta in `ChildGuardian`. Ogni controllo
 * "è il genitore di questo figlio?" passa di qui, mai da un confronto su un
 * singolo campo.
 */

/** Filtro Prisma su `Child`: i figli di cui `userId` è genitore. */
export function guardianOf(userId: string): Prisma.ChildWhereInput {
  return { guardians: { some: { userId } } };
}

/** `userId` è uno dei genitori di `childId`? */
export async function isGuardian(userId: string, childId: string): Promise<boolean> {
  const link = await prisma.childGuardian.findUnique({
    where: { childId_userId: { childId, userId } },
    select: { childId: true },
  });
  return !!link;
}

/** Select dei genitori per mostrarli (ordine di collegamento, il primo è chi l'ha registrato). */
export const GUARDIANS_SELECT = {
  guardians: {
    orderBy: { createdAt: "asc" },
    select: { user: { select: { id: true, name: true, email: true } } },
  },
} satisfies Prisma.ChildSelect;

export interface GuardianInfo {
  id: string;
  name: string | null;
  email: string;
}

/** Appiattisce `guardians: [{ user }]` in una lista di utenti. */
export function guardianList(child: { guardians: { user: GuardianInfo }[] }): GuardianInfo[] {
  return child.guardians.map((g) => g.user);
}

export { guardianNames } from "@/lib/guardianNames";

/**
 * Elimina un utente e i figli per cui era l'unico genitore.
 *
 * Prima di `ChildGuardian` il figlio si cancellava in cascata col genitore;
 * ora la cascata toglie solo il collegamento, e senza questo passaggio
 * resterebbero figli senza nessuno che li gestisca (e dati di minori senza
 * più un titolare). I figli con un altro genitore restano a lui.
 */
export async function deleteUserAndOrphanedChildren(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const links = await tx.childGuardian.findMany({
      where: { userId },
      select: { childId: true, child: { select: { _count: { select: { guardians: true } } } } },
    });
    const orphaned = links.filter((l) => l.child._count.guardians <= 1).map((l) => l.childId);
    if (orphaned.length > 0) {
      await tx.child.deleteMany({ where: { id: { in: orphaned } } });
    }
    await tx.user.delete({ where: { id: userId } });
  });
}
