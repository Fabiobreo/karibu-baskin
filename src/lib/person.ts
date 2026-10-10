import { prisma } from "@/lib/db";

/**
 * Una persona, due chiavi.
 *
 * Chi ha un account può avere anche una scheda figlio collegata
 * (`Child.userId`): è il legame con i genitori. Sono la stessa persona, e il
 * ragazzo dal suo account e i genitori dalla scheda devono vedere e fare le
 * stesse cose, sugli stessi dati.
 *
 * Regole, valide ovunque:
 *  - i dati sportivi (squadra, convocazioni, disponibilità, statistiche,
 *    iscrizioni, traguardi, livello) stanno sull'**account**: una scheda che ne
 *    aveva li cede al collegamento (`@/lib/childHistory`);
 *  - i **genitori** agiscono sull'account passando dalla scheda: rispondono
 *    alle disponibilità, iscrivono agli allenamenti, ricevono le notifiche;
 *  - in lettura si guardano comunque tutte e due le chiavi, così una scheda
 *    collegata prima di questa regola non resta a metà.
 *
 * Le risposte agli eventi fanno eccezione: lì la riga è della scheda
 * (`@/lib/eventFamily`).
 */

/**
 * Filtro Prisma (`OR`) sulle tabelle con `userId` / `childId` che prende le
 * righe della persona, qualunque delle due chiavi le porti.
 */
export function personRows(child: {
  id: string;
  userId: string | null;
}): ({ childId: string } | { userId: string })[] {
  return [{ childId: child.id }, ...(child.userId ? [{ userId: child.userId }] : [])];
}

/**
 * Gli account da avvisare per quello che riguarda un atleta: lui e i genitori
 * della sua scheda, se ne ha una. Ogni invio che parte da un elenco di account
 * (squadra, ruolo, convocati, promemoria) passa di qui, così i genitori di un
 * ragazzo con l'account ricevono quello che riceve lui. Ognuno spegne ciò che
 * non vuole dalle proprie preferenze.
 */
export async function withGuardians(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const cards = await prisma.child.findMany({
    where: { userId: { in: userIds } },
    select: { guardians: { select: { userId: true } } },
  });
  const ids = new Set(userIds);
  for (const card of cards) for (const g of card.guardians) ids.add(g.userId);
  return [...ids];
}
