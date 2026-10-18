/** Il minimo di un convocato che serve per raggrupparlo: nome e ruolo Baskin. */
interface GroupableCallup {
  user: { name: string | null; sportRole: number | null } | null;
  child: { name: string; sportRole: number | null } | null;
}

export interface CallupGroup<T> {
  /** Ruolo Baskin 1-5, null per chi non ne ha uno (sempre in fondo). */
  role: number | null;
  list: T[];
}

/**
 * Convocati raggruppati per ruolo Baskin crescente, chi non ha un ruolo in
 * fondo. Dentro un ruolo: per `points` decrescenti se passato (partita
 * giocata), poi per nome. Lo usano la distinta della pagina partita e
 * l'immagine da condividere, così le due hanno lo stesso ordine.
 */
export function groupCallupsByRole<T extends GroupableCallup>(
  callups: T[],
  points?: (c: T) => number
): CallupGroup<T>[] {
  const byRole = new Map<number | null, T[]>();
  for (const c of callups) {
    const role = (c.user ?? c.child)?.sportRole ?? null;
    const key = role && role >= 1 && role <= 5 ? role : null;
    byRole.set(key, [...(byRole.get(key) ?? []), c]);
  }
  const nameOf = (c: T) => (c.user ?? c.child)?.name ?? "";
  const order: (number | null)[] = [1, 2, 3, 4, 5, null];
  return order
    .filter((r) => byRole.has(r))
    .map((role) => ({
      role,
      list: [...byRole.get(role)!].sort((a, b) =>
        points && points(a) !== points(b)
          ? points(b) - points(a)
          : nameOf(a).localeCompare(nameOf(b), "it")
      ),
    }));
}
