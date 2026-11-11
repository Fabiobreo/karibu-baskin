/**
 * Chi tiene insieme una famiglia: per ogni scheda figlio, i suoi genitori
 * (`ChildGuardian`) e il suo account, se ne ha uno (`Child.userId`). È la
 * regola di `loadFamily` (`@/lib/eventFamily`) per le risposte agli eventi e
 * delle "famiglie attive" nelle metriche (UX-55): se cambia qui, cambia per
 * tutte e due. Modulo puro, senza database.
 */

export interface ChildLinkRow {
  userId: string | null;
  guardians: { userId: string }[];
}

/** Gli account che una scheda figlio lega fra loro. */
export function childLinkedAccounts(child: ChildLinkRow): string[] {
  const ids = child.guardians.map((g) => g.userId);
  if (child.userId) ids.push(child.userId);
  return ids;
}

/**
 * Divide gli account in famiglie: due account sono della stessa famiglia se
 * una scheda figlio li lega (genitori dello stesso figlio, figlio con il suo
 * account). Chi non ha legami è una famiglia da solo. Restituisce, per ogni
 * account di `userIds`, la chiave della sua famiglia.
 *
 * A differenza di `loadFamily`, che guarda a due passi da chi risponde, qui le
 * famiglie devono essere una partizione (ogni account in una sola): i legami
 * si seguono fino in fondo. Nelle famiglie dell'app le due cose coincidono.
 */
export function groupFamilies(userIds: string[], children: ChildLinkRow[]): Map<string, string> {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    // Compressione del cammino.
    let cur = id;
    while (cur !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  for (const id of userIds) parent.set(id, id);
  for (const child of children) {
    const ids = childLinkedAccounts(child).filter((id) => parent.has(id));
    for (let i = 1; i < ids.length; i++) {
      const a = find(ids[0]);
      const b = find(ids[i]);
      if (a !== b) parent.set(b, a);
    }
  }
  const out = new Map<string, string>();
  for (const id of userIds) out.set(id, find(id));
  return out;
}
