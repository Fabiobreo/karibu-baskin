import { prisma } from "@/lib/db";
import { guardianOf } from "@/lib/guardians";
import { loadMyAvailabilityMatches } from "@/lib/matches/myAvailabilities";

/**
 * Stato di chi guarda per le partite della home: è convocato (lui o un figlio)?
 * Deve ancora dire se c'è? Una riga sola per card, la convocazione prima.
 */
export interface HomeCallupStatus {
  /** Chi guarda è fra i convocati (con l'account o con la propria scheda). */
  calledSelf: boolean;
  /** Nomi (solo il primo) dei figli fra i convocati. */
  calledOthers: string[];
  /** Nessuno di famiglia convocato, e manca almeno una risposta di disponibilità. */
  pending: boolean;
}

interface FamilyCard {
  id: string;
  name: string;
  userId: string | null;
}

interface CallupKey {
  matchId: string;
  userId: string | null;
  childId: string | null;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * Calcolo puro. `family` sono le schede dei figli e la propria (quella con
 * `userId` uguale a chi guarda): un figlio con l'account ha la convocazione
 * sull'account (@/lib/person), per questo si confrontano tutte e due le chiavi.
 */
export function buildHomeCallupStatus(
  viewerId: string,
  matchIds: string[],
  family: FamilyCard[],
  callups: CallupKey[],
  pendingMatchIds: Set<string>
): Record<string, HomeCallupStatus> {
  const ownCardId = family.find((c) => c.userId === viewerId)?.id ?? null;
  const children = family.filter((c) => c.userId !== viewerId);
  const out: Record<string, HomeCallupStatus> = {};
  for (const matchId of matchIds) {
    const rows = callups.filter((c) => c.matchId === matchId);
    const calledSelf = rows.some(
      (c) => c.userId === viewerId || (!!ownCardId && c.childId === ownCardId)
    );
    const calledOthers = children
      .filter((ch) =>
        rows.some((c) => c.childId === ch.id || (!!ch.userId && c.userId === ch.userId))
      )
      .map((ch) => firstName(ch.name));
    out[matchId] = {
      calledSelf,
      calledOthers,
      pending: !calledSelf && calledOthers.length === 0 && pendingMatchIds.has(matchId),
    };
  }
  return out;
}

/** Stato per le partite della home, solo per un tesserato. */
export async function loadHomeCallupStatus(
  viewerId: string,
  viewerName: string,
  matchIds: string[],
  now: Date
): Promise<Record<string, HomeCallupStatus>> {
  if (matchIds.length === 0) return {};
  const family = await prisma.child.findMany({
    where: { OR: [guardianOf(viewerId), { userId: viewerId }] },
    select: { id: true, name: true, userId: true },
  });
  const userIds = [viewerId, ...family.flatMap((c) => (c.userId ? [c.userId] : []))];
  const childIds = family.map((c) => c.id);
  const [callups, availability] = await Promise.all([
    prisma.matchCallup.findMany({
      where: {
        matchId: { in: matchIds },
        OR: [
          { userId: { in: userIds } },
          ...(childIds.length > 0 ? [{ childId: { in: childIds } }] : []),
        ],
      },
      select: { matchId: true, userId: true, childId: true },
    }),
    loadMyAvailabilityMatches(viewerId, viewerName, { from: now }),
  ]);
  const pending = new Set(
    availability.filter((m) => m.entities.some((e) => e.available === null)).map((m) => m.matchId)
  );
  return buildHomeCallupStatus(viewerId, matchIds, family, callups, pending);
}
