/**
 * Testi e voci delle righe delle liste admin che dipendono dallo stato (UX-47).
 * Il disegno è di `RowActions`; qui solo le scelte, così si provano senza DOM.
 */

import { formatRelative } from "date-fns";
import { it } from "date-fns/locale";

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

/** Voce "Avvisa": la prima volta avvisa tutti, poi è un secondo avviso. */
export function notifyActionLabel(lastNotifiedAt: string | Date | null | undefined): string {
  return lastNotifiedAt ? "Avvisa di nuovo…" : "Avvisa tutti…";
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "ieri alle 18:40", "oggi alle 10:32", "sabato scorso alle 9:00", "04/09/2026". */
export function lastNotifiedLabel(lastNotifiedAt: string | Date, now: number): string {
  return formatRelative(new Date(lastNotifiedAt), now, { locale: it });
}

/**
 * Conferma di "Avvisa tutti…" / "Avvisa di nuovo…": dice a chi arriva, quando è
 * partito l'ultimo avviso e che non si ritira. Se ne è partito uno da meno di
 * un giorno lo dice per primo: è il caso in cui conviene fermarsi.
 */
export function notifyConfirm(opts: {
  title: string;
  lastNotifiedAt: string | Date | null | undefined;
  now: number;
  /** "a tutti" (default) o, per un allenamento riservato, "a chi può iscriversi". */
  audience?: string;
}): { title: string; message: string; confirmLabel: string } {
  const { title, lastNotifiedAt, now, audience = "a tutti" } = opts;
  const sends = `Parte una notifica ${audience} per "${title}".`;
  const noUndo = "La notifica non si può ritirare.";
  if (!lastNotifiedAt) {
    return {
      title: "Avvisare tutti?",
      message: `${sends} Finora non è partito nessun avviso. ${noUndo}`,
      confirmLabel: "Avvisa",
    };
  }
  const recent = now - new Date(lastNotifiedAt).getTime() < DAY_MS;
  return {
    title: "Avvisare di nuovo?",
    message: `${recent ? "Nelle ultime 24 ore è già partito un avviso. " : ""}${sends} Ultimo avviso: ${lastNotifiedLabel(lastNotifiedAt, now)}. ${noUndo}`,
    confirmLabel: "Avvisa di nuovo",
  };
}

export type NewsMenuKey = "publish" | "publishSilent" | "unpublish" | "public" | "notify";

export interface NewsMenuEntry {
  key: NewsMenuKey;
  label: string;
}

/**
 * Le voci del "⋯" di una news, oltre a "Modifica" (in riga) ed "Elimina"
 * (sempre in fondo). Pubblicare avvisa tutti, quindi lo dice, e accanto c'è la
 * via silenziosa; la pagina pubblica di una bozza non esiste (404), quindi la
 * voce c'è solo se è uscita. "Avvisa" c'è solo finché l'API lo accetta
 * (`canNotifyPost`).
 */
export function newsMenuEntries(
  published: boolean,
  opts: { canNotify?: boolean; notified?: boolean } = {}
): NewsMenuEntry[] {
  if (!published) {
    return [
      { key: "publish", label: "Pubblica (avvisa tutti)" },
      { key: "publishSilent", label: "Pubblica senza avvisare" },
    ];
  }
  return [
    ...(opts.canNotify
      ? [{ key: "notify" as const, label: notifyActionLabel(opts.notified ? "x" : null) }]
      : []),
    { key: "unpublish", label: "Rimetti in bozza" },
    { key: "public", label: "Pagina pubblica" },
  ];
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
