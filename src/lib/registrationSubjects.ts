/**
 * Una persona, una voce (UX-42). Chi ha un account può avere anche una scheda
 * figlio collegata (`Child.userId`), e a volte ne è pure tutore: nelle scelte
 * "per chi?" quella scheda è lui, non un figlio. Qui la si separa dagli altri
 * figli; la usano il form d'iscrizione e la card "prossima cosa da fare", così
 * dicono la stessa cosa.
 */
export function splitOwnChild<T extends { id: string; userId: string | null }>(
  children: T[],
  selfId: string | null,
  linkedChildId: string | null = null
): { own: T | null; others: T[] } {
  const isOwn = (c: T) =>
    (!!selfId && c.userId === selfId) || (!!linkedChildId && c.id === linkedChildId);
  return { own: children.find(isOwn) ?? null, others: children.filter((c) => !isOwn(c)) };
}
