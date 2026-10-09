/**
 * Regole di "Avvisa di nuovo", senza dipendenze dal server: le leggono sia le
 * rotte sia i componenti del pannello, così il menu non offre un'azione che
 * l'API rifiuterebbe.
 */

/**
 * Fra due avvisi per la stessa cosa devono passare almeno dieci minuti: ferma
 * il doppio tocco e due persone dello staff che avvisano insieme.
 */
export const RENOTIFY_COOLDOWN_MS = 10 * 60 * 1000;

/** Oltre un mese dalla pubblicazione una news non si rimanda più. */
export const POST_RENOTIFY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Un post si può (ri)avvisare se è uscito, e da non più di un mese. */
export function canNotifyPost(publishedAt: string | Date | null, now: number): boolean {
  if (!publishedAt) return false;
  return now - new Date(publishedAt).getTime() <= POST_RENOTIFY_MAX_AGE_MS;
}
