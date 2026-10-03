/**
 * Testi e voci delle righe delle liste admin che dipendono dallo stato (UX-47).
 * Il disegno è di `RowActions`; qui solo le scelte, così si provano senza DOM.
 */

/** Conferma dell'eliminazione di un evento: lo nomina e dice quante risposte si perdono. */
export function eventDeleteMessage(title: string, responses: number): string {
  const lost =
    responses === 0
      ? "Nessuno ha ancora risposto."
      : responses === 1
        ? "Si perde anche l'unica risposta già data."
        : `Si perdono anche le ${responses} risposte già date.`;
  return `Eliminare "${title}"? ${lost} L'azione non si può annullare.`;
}

export type NewsMenuKey = "publish" | "unpublish" | "public";

export interface NewsMenuEntry {
  key: NewsMenuKey;
  label: string;
}

/**
 * Le voci del "⋯" di una news, oltre a "Modifica" (in riga) ed "Elimina"
 * (sempre in fondo). Pubblicare avvisa tutti, quindi lo dice; la pagina
 * pubblica di una bozza non esiste (404), quindi la voce c'è solo se è uscita.
 */
export function newsMenuEntries(published: boolean): NewsMenuEntry[] {
  return published
    ? [
        { key: "unpublish", label: "Rimetti in bozza" },
        { key: "public", label: "Pagina pubblica" },
      ]
    : [{ key: "publish", label: "Pubblica (avvisa tutti)" }];
}

export type TeamMenuKey = "edit" | "public";

/**
 * Le voci del "⋯" di una squadra agonistica, oltre a "Rosa" (in riga).
 * Modifica ed eliminazione sono dell'admin: l'API le rifiuta all'allenatore,
 * e un'azione che darebbe errore non si mostra.
 */
export function teamMenuEntries(isAdmin: boolean): {
  keys: TeamMenuKey[];
  canDelete: boolean;
} {
  return { keys: isAdmin ? ["edit", "public"] : ["public"], canDelete: isAdmin };
}
