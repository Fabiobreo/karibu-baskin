import { prisma } from "@/lib/db";

/**
 * Famiglia di chi risponde a un evento: in famiglia risponde uno per tutti
 * ("ci iscriviamo? faccio io"), anche per gli adulti che hanno un account.
 *
 * La famiglia si ricava dai collegamenti che l'app ha gia': `ChildGuardian`
 * (genitore ↔ figlio) e `Child.userId` (la scheda figlio di chi ha anche un
 * account, es. un atleta adulto figlio di tesserati). Due passaggi: i miei
 * figli e la mia scheda figlio, poi i loro genitori e account, poi gli altri
 * figli di quei genitori. Cosi' ci sono genitori, figli, fratelli e l'altro
 * genitore, senza allargarsi a famiglie ricomposte lontane.
 *
 * Ogni persona ha una sola risposta per evento, condivisa dalla famiglia: chi
 * risponde dopo la modifica, non ne aggiunge una seconda. Per chi ha sia una
 * scheda figlio sia un account la riga canonica e' quella della scheda
 * (`childId`); una vecchia riga sull'account si legge come ripiego e si
 * elimina al salvataggio.
 */

export type MemberKey = `u:${string}` | `c:${string}`;

export interface FamilyMember {
  key: MemberKey;
  /** Account della persona, se ne ha uno (anche per un figlio con account). */
  userId: string | null;
  /** Scheda figlio, se esiste: e' lei a portare la risposta. */
  childId: string | null;
  name: string;
  isSelf: boolean;
}

interface ChildRow {
  id: string;
  name: string;
  userId: string | null;
  guardians: { userId: string }[];
}

const MAX_MEMBERS = 20;

/** Parte pura: da utenti e schede figlio trovati, i membri (senza doppioni). */
export function buildFamilyMembers(
  selfId: string,
  users: { id: string; name: string | null }[],
  children: ChildRow[]
): FamilyMember[] {
  const accountsWithChild = new Set(children.map((c) => c.userId).filter(Boolean) as string[]);
  const members: FamilyMember[] = [
    ...children.map((c) => ({
      key: `c:${c.id}` as MemberKey,
      userId: c.userId,
      childId: c.id,
      name: c.name,
      isSelf: c.userId === selfId,
    })),
    ...users
      .filter((u) => !accountsWithChild.has(u.id))
      .map((u) => ({
        key: `u:${u.id}` as MemberKey,
        userId: u.id,
        childId: null,
        name: u.name ?? "—",
        isSelf: u.id === selfId,
      })),
  ];
  // Io per primo, poi in ordine alfabetico.
  return members
    .sort((a, b) => Number(b.isSelf) - Number(a.isSelf) || a.name.localeCompare(b.name, "it"))
    .slice(0, MAX_MEMBERS);
}

async function childrenOf(userIds: string[]): Promise<ChildRow[]> {
  if (userIds.length === 0) return [];
  return prisma.child.findMany({
    where: {
      OR: [{ guardians: { some: { userId: { in: userIds } } } }, { userId: { in: userIds } }],
    },
    select: { id: true, name: true, userId: true, guardians: { select: { userId: true } } },
    take: MAX_MEMBERS,
  });
}

export async function loadFamily(selfId: string): Promise<FamilyMember[]> {
  const userIds = new Set([selfId]);
  const children = new Map<string, ChildRow>();

  // 1: i miei figli e la mia scheda figlio → i loro genitori e account.
  for (const c of await childrenOf([selfId])) {
    children.set(c.id, c);
    c.guardians.forEach((g) => userIds.add(g.userId));
    if (c.userId) userIds.add(c.userId);
  }
  // 2: gli altri figli di quei genitori (fratelli). Non si risale oltre.
  const others = [...userIds].filter((id) => id !== selfId);
  for (const c of await childrenOf(others)) {
    if (children.has(c.id)) continue;
    children.set(c.id, c);
    if (c.userId) userIds.add(c.userId);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, name: true },
  });
  return buildFamilyMembers(selfId, users, [...children.values()]);
}

/** Filtro Prisma sulle righe (presenza o opzione) che appartengono a un membro. */
export function memberRowFilter(m: FamilyMember): { childId: string } | { userId: string } {
  return m.childId ? { childId: m.childId } : { userId: m.userId! };
}
