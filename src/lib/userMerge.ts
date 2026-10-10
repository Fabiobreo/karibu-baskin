import type { AppRole, Prisma } from "@prisma/client";

/**
 * Unione di un account in attesa nella scheda che lo staff aveva creato con
 * un'email sbagliata: la persona è entrata con l'indirizzo giusto e ora esiste
 * due volte. L'accesso (email, login, sessioni, notifiche push) e le poche cose
 * fatte da ospite passano alla scheda vera, poi l'ospite sparisce.
 *
 * Non si annulla: per questo si unisce solo un ospite "leggero". Tutto ciò che
 * farebbe di lui una persona a sé (figli, squadra, partite) blocca l'unione.
 */

export interface MergeSourceFacts {
  appRole: AppRole;
  hasChildAccount: boolean;
  guardianOf: number;
  linkRequests: number;
  teamMemberships: number;
  /** Statistiche, convocazioni e MVP: qualunque traccia di partite giocate. */
  matchRows: number;
}

/** Motivi per cui l'account non si può unire; vuoto = si può. */
export function mergeBlockers(source: MergeSourceFacts): string[] {
  const blockers: string[] = [];
  if (source.appRole !== "GUEST") {
    blockers.push("non è più un ospite (se è un doppione, riportalo prima a Ospite)");
  }
  if (source.guardianOf > 0) blockers.push("è genitore di un figlio");
  if (source.hasChildAccount) blockers.push("è collegato a una scheda figlio");
  if (source.linkRequests > 0) blockers.push("ha richieste di collegamento genitore-figlio");
  if (source.teamMemberships > 0 || source.matchRows > 0) {
    blockers.push("ha già una squadra o delle partite sue");
  }
  return blockers;
}

/**
 * Sposta dall'ospite alla scheda ciò che un ospite può aver fatto: accessi,
 * notifiche push, iscrizioni agli allenamenti e risposte agli eventi. Dove la
 * scheda ha già la sua riga (stesso allenamento, stesso evento) vince la sua.
 *
 * Le iscrizioni vanno spostate prima di eliminare l'ospite: `Registration.user`
 * è `SetNull`, altrimenti resterebbero come iscrizioni anonime.
 */
export async function moveGuestData(
  tx: Prisma.TransactionClient,
  sourceId: string,
  targetId: string
): Promise<{ registrations: number }> {
  const from = { userId: sourceId };
  const to = { userId: targetId };

  await tx.account.updateMany({ where: from, data: to });
  await tx.session.updateMany({ where: from, data: to });
  await tx.pushSubscription.updateMany({ where: from, data: to });

  const [ownRegs, ownRsvps, ownSelections] = await Promise.all([
    tx.registration.findMany({ where: to, select: { sessionId: true } }),
    tx.eventAttendance.findMany({ where: to, select: { eventId: true } }),
    tx.eventOptionSelection.findMany({ where: to, select: { optionId: true } }),
  ]);

  await tx.registration.deleteMany({
    where: { ...from, sessionId: { in: ownRegs.map((r) => r.sessionId) } },
  });
  const moved = await tx.registration.updateMany({ where: from, data: to });

  await tx.eventAttendance.deleteMany({
    where: { ...from, eventId: { in: ownRsvps.map((r) => r.eventId) } },
  });
  await tx.eventAttendance.updateMany({ where: from, data: to });
  await tx.eventAttendance.updateMany({
    where: { respondedById: sourceId },
    data: { respondedById: targetId },
  });

  await tx.eventOptionSelection.deleteMany({
    where: { ...from, optionId: { in: ownSelections.map((s) => s.optionId) } },
  });
  await tx.eventOptionSelection.updateMany({ where: from, data: to });
  await tx.eventGuest.updateMany({
    where: { addedById: sourceId },
    data: { addedById: targetId },
  });

  return { registrations: moved.count };
}
