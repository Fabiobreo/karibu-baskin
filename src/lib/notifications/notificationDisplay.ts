import type { AppNotificationType } from "@prisma/client";

/**
 * Come si legge una notifica in una riga (UX-42): il contenuto è il titolo, il
 * tipo è l'occhiello. Nel DB i due campi non hanno un ruolo fisso: per alcuni
 * tipi `title` è un'etichetta generica ("Nuova news") e il contenuto sta in
 * `body`, per altri `title` è già il contenuto ("Vittoria! Arancioni vs …").
 * La regola sta qui, per tipo, così vale anche per le notifiche già salvate.
 */

/**
 * Dove sta il contenuto, tipo per tipo. `Record` sull'enum di Prisma: un tipo
 * nuovo non compila finché non viene classificato.
 */
const CONTENT_FIELD: Record<AppNotificationType, "title" | "body"> = {
  NEW_TRAINING: "body",
  NEW_POST: "body",
  NEW_POLL: "body",
  NEW_EVENT: "body",
  TEAMS_READY: "body",
  BADGE_UNLOCKED: "body",
  MATCH_RESULT: "title",
  LINK_REQUEST: "title",
  LINK_RESPONSE: "title",
  BIRTHDAY: "title",
  SYSTEM: "title",
};

/**
 * Titolo della notifica di un allenamento nuovo (lo scrive `sessionNotify`).
 * Gli altri titoli dello stesso tipo ("Iscrizioni chiuse", "Allenamento
 * aggiornato") non sono etichette: dicono cosa è cambiato, e restano titolo.
 */
export const NEW_TRAINING_TITLE = "Nuovo allenamento";

/** Tipi con un'etichetta propria nei dizionari (`pages.notifiche.type.*`). */
const LABELLED_TYPES = [
  "NEW_TRAINING",
  "MATCH_RESULT",
  "LINK_REQUEST",
  "LINK_RESPONSE",
  "BIRTHDAY",
] as const;
export type NotificationTypeLabelKey = (typeof LABELLED_TYPES)[number] | "SYSTEM";

export interface NotificationDisplay {
  /** La prima cosa che si legge. */
  headline: string;
  /** Riga di dettaglio sotto il titolo, se serve. */
  detail: string | null;
  /** Occhiello già pronto (il `title` salvato), oppure null: usare `eyebrowKey`. */
  eyebrow: string | null;
  /** Chiave dell'etichetta del tipo, quando l'occhiello non è nel dato. */
  eyebrowKey: NotificationTypeLabelKey;
}

// Le emoji in testa ai titoli servono alle push; nella lista il tipo lo dice
// già l'icona neutra. Una emoji può essere una sequenza: pittogramma, toni
// della pelle, unioni (ZWJ), selettore di variante, bandiere, tasti numerati.
const LEADING_EMOJI =
  /^(?:(?:[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u200D\uFE0F]|[0-9#*]\uFE0F?\u20E3)+\s*)+/u;

function clean(text: string): string {
  return text.replace(LEADING_EMOJI, "").trim();
}

function contentInBody(type: string, title: string): boolean {
  if (type === "NEW_TRAINING") return title === NEW_TRAINING_TITLE;
  return (CONTENT_FIELD as Record<string, "title" | "body" | undefined>)[type] === "body";
}

export function notificationDisplay(n: {
  type: string;
  title: string;
  body: string;
}): NotificationDisplay {
  const eyebrowKey = (LABELLED_TYPES as readonly string[]).includes(n.type)
    ? (n.type as NotificationTypeLabelKey)
    : "SYSTEM";
  const title = clean(n.title);
  const body = n.body.trim();

  if (body && contentInBody(n.type, title)) {
    return { headline: body, detail: null, eyebrow: title || null, eyebrowKey };
  }
  return {
    headline: title || body,
    detail: title && body ? body : null,
    eyebrow: null,
    eyebrowKey,
  };
}
