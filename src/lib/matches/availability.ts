import { prisma } from "@/lib/db";

/**
 * Disponibilità a una partita: lettura e scrittura con la regola della persona
 * unica (@/lib/person). Chi ha un account e una scheda figlio collegata è una
 * persona sola: la risposta sta sull'account, una vecchia riga sulla scheda
 * vale solo come ripiego in lettura e si toglie alla prima scrittura.
 *
 * Ogni posto che legge una risposta per decidere qualcosa (convocazioni,
 * promemoria) passa di qui, così una persona non risulta "senza risposta" da
 * una chiave e "disponibile" dall'altra.
 */

export interface AvailabilityAnswer {
  available: boolean;
  /** La risposta l'ha segnata lo staff, non la persona o un genitore. */
  setByStaff: boolean;
}

export interface AvailabilityRow extends AvailabilityAnswer {
  userId: string | null;
  childId: string | null;
}

export interface AvailabilityLookup {
  /** Risposta di un account (o della sua scheda figlio), null se manca. */
  forUser(userId: string): AvailabilityAnswer | null;
  /** Risposta di una scheda figlio (o del suo account), null se manca. */
  forChild(childId: string): AvailabilityAnswer | null;
  /** Risposta di un giocatore qualunque sia la chiave con cui arriva. */
  forPerson(person: { userId?: string | null; childId?: string | null }): AvailabilityAnswer | null;
}

/** Parte pura: righe salvate + legami scheda ↔ account → risposta per persona. */
export function buildAvailabilityLookup(
  rows: AvailabilityRow[],
  linkedCards: { id: string; userId: string }[]
): AvailabilityLookup {
  const byUser = new Map<string, AvailabilityAnswer>();
  const byChild = new Map<string, AvailabilityAnswer>();
  for (const r of rows) {
    const answer = { available: r.available, setByStaff: r.setByStaff };
    if (r.userId) byUser.set(r.userId, answer);
    if (r.childId) byChild.set(r.childId, answer);
  }
  const cardOfAccount = new Map(linkedCards.map((c) => [c.userId, c.id]));
  const accountOfCard = new Map(linkedCards.map((c) => [c.id, c.userId]));

  // L'account prima: la riga sulla scheda è solo il ripiego di prima della regola.
  const forUser = (userId: string) =>
    byUser.get(userId) ?? byChild.get(cardOfAccount.get(userId) ?? "") ?? null;
  const forChild = (childId: string) =>
    byUser.get(accountOfCard.get(childId) ?? "") ?? byChild.get(childId) ?? null;

  return {
    forUser,
    forChild,
    forPerson: (p) => (p.userId ? forUser(p.userId) : p.childId ? forChild(p.childId) : null),
  };
}

/** Carica le risposte a una partita di questi giocatori, su tutte e due le chiavi. */
export async function loadAvailabilityLookup(
  matchId: string,
  userIds: string[],
  childIds: string[]
): Promise<AvailabilityLookup> {
  if (userIds.length === 0 && childIds.length === 0) return buildAvailabilityLookup([], []);

  const linked = await prisma.child.findMany({
    where: {
      OR: [
        ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : []),
        ...(childIds.length > 0 ? [{ id: { in: childIds } }] : []),
      ],
      userId: { not: null },
    },
    select: { id: true, userId: true },
  });
  const linkedCards = linked.flatMap((c) => (c.userId ? [{ id: c.id, userId: c.userId }] : []));
  const rowUserIds = [...new Set([...userIds, ...linkedCards.map((c) => c.userId)])];
  const rowChildIds = [...new Set([...childIds, ...linkedCards.map((c) => c.id)])];

  const rows = await prisma.matchAvailability.findMany({
    where: {
      matchId,
      OR: [
        ...(rowUserIds.length > 0 ? [{ userId: { in: rowUserIds } }] : []),
        ...(rowChildIds.length > 0 ? [{ childId: { in: rowChildIds } }] : []),
      ],
    },
    select: { userId: true, childId: true, available: true, setByStaff: true },
  });
  return buildAvailabilityLookup(rows, linkedCards);
}

/**
 * Salva la risposta di un giocatore. Per chi ha un account la riga va
 * sull'account e quella vecchia della scheda si toglie, così non restano due
 * risposte diverse. `setByStaff` dice chi ha risposto: una risposta della
 * persona o di un genitore lo rimette a false.
 */
export async function saveAvailability(input: {
  matchId: string;
  person: { kind: "user" | "child"; id: string };
  available: boolean;
  setByStaff: boolean;
}): Promise<void> {
  const { matchId, person, available, setByStaff } = input;

  let accountId: string | null;
  let cardId: string | null;
  if (person.kind === "user") {
    accountId = person.id;
    const card = await prisma.child.findUnique({
      where: { userId: person.id },
      select: { id: true },
    });
    cardId = card?.id ?? null;
  } else {
    cardId = person.id;
    const card = await prisma.child.findUnique({
      where: { id: person.id },
      select: { userId: true },
    });
    accountId = card?.userId ?? null;
  }

  if (!accountId) {
    await prisma.matchAvailability.upsert({
      where: { matchId_childId: { matchId, childId: person.id } },
      create: { matchId, childId: person.id, available, setByStaff },
      update: { available, setByStaff },
    });
    return;
  }

  await prisma.$transaction([
    ...(cardId
      ? [prisma.matchAvailability.deleteMany({ where: { matchId, childId: cardId } })]
      : []),
    prisma.matchAvailability.upsert({
      where: { matchId_userId: { matchId, userId: accountId } },
      create: { matchId, userId: accountId, available, setByStaff },
      update: { available, setByStaff },
    }),
  ]);
}
