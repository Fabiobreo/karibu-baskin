import { prisma } from "@/lib/db";
import { withGuardians } from "@/lib/person";

/** Allenatori e admin: chi gestisce il pannello e riceve gli avvisi di lavoro. */
export async function staffUserIds(): Promise<string[]> {
  const staff = await prisma.user.findMany({
    where: { appRole: { in: ["COACH", "ADMIN"] } },
    select: { id: true },
  });
  return staff.map((s) => s.id);
}

/**
 * Account da avvisare per un elenco di giocatori: l'account del giocatore e
 * i genitori della sua scheda figlio, se ne ha una; per un figlio, tutti i
 * suoi genitori più il suo account, se ne ha uno.
 * Stessa regola di `resolveFilterUserIds`, ma partendo dalle persone.
 */
export async function playerRecipientIds(
  players: { userId?: string | null; childId?: string | null }[]
): Promise<string[]> {
  const ids = new Set<string>();
  const childIds = new Set<string>();
  for (const p of players) {
    if (p.userId) ids.add(p.userId);
    else if (p.childId) childIds.add(p.childId);
  }

  if (childIds.size > 0) {
    const children = await prisma.child.findMany({
      where: { id: { in: [...childIds] } },
      select: { userId: true, guardians: { select: { userId: true } } },
    });
    for (const c of children) {
      for (const g of c.guardians) ids.add(g.userId);
      if (c.userId) ids.add(c.userId);
    }
  }

  return withGuardians([...ids]);
}
