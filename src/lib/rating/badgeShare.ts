/**
 * Card dei traguardi da condividere (UX-59): regole pure, condivise da server
 * (profilo, avvisi) e client (bottone "Condividi").
 */

/**
 * Ancora di un traguardo nel profilo. I propri sono `#traguardo-<id>`; quelli
 * dei figli portano anche la chiave del figlio, perché due fratelli possono
 * avere lo stesso traguardo nella stessa pagina.
 */
export function badgeAnchorId(badgeId: string, ownerKey?: string): string {
  return ownerKey ? `traguardo-${badgeId}-${ownerKey}` : `traguardo-${badgeId}`;
}

/**
 * Dove porta l'avviso di un traguardo: il proprio profilo, sul traguardo; per
 * i genitori la scheda Famiglia, sul traguardo del figlio.
 */
export function badgeNotificationUrl(badgeId: string, ownerKey: string, isSelf: boolean): string {
  return isSelf
    ? `/profilo#${badgeAnchorId(badgeId)}`
    : `/profilo?tab=famiglia#${badgeAnchorId(badgeId, ownerKey)}`;
}

/** Solo il nome di battesimo: sulla card il cognome non c'è mai. */
export function firstNameOf(name: string | null | undefined): string {
  const clean = (name ?? "").trim();
  return clean.split(/\s+/)[0] ?? "";
}

/**
 * Pagina del link nel messaggio: il profilo pubblico se la persona ne ha uno
 * e non è minorenne (per chi non è tesserato il profilo di un minore risponde
 * 404), altrimenti la home.
 */
export function badgeSharePath(subject: { minor: boolean; profileSlug: string | null }): string {
  if (subject.minor || !subject.profileSlug) return "/";
  return `/giocatori/${subject.profileSlug}`;
}

/** Chi compare sulla card: lo prepara il server, lo usa il bottone. */
export interface BadgeShareSubject {
  firstName: string;
  minor: boolean;
  /** Pagina del link (`badgeSharePath`). */
  path: string;
  /** Proprio profilo (prima persona nel messaggio) o di un figlio. */
  self: boolean;
}
