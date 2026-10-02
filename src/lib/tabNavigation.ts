/**
 * Navigazione della barra in basso nell'app installata.
 *
 * Nel browser ogni tocco su una scheda aggiunge una voce alla cronologia, come
 * qualunque link. Nell'app installata invece il gesto "indietro" di Android
 * deve comportarsi come nelle app native con la barra in basso: le schede non
 * si accumulano, indietro da una scheda porta alla Home e indietro dalla Home
 * esce dall'app. Altrimenti, dopo un giro fra le schede, per uscire servono
 * decine di gesti.
 *
 * Regole (solo nell'app installata):
 * - dalla Home a una scheda: si aggiunge una voce (indietro torna alla Home);
 * - da qualunque altra pagina a una scheda: si sostituisce la voce corrente;
 * - alla Home: se la voce precedente è la Home ci si torna con indietro (niente
 *   doppioni), altrimenti si sostituisce la voce corrente.
 *
 * I link nelle pagine restano spostamenti in profondità e aggiungono voci:
 * dal dettaglio di una partita, indietro torna alla lista.
 */

export type TabNavigationAction =
  | { kind: "push"; href: string }
  | { kind: "replace"; href: string }
  | { kind: "back" };

export interface TabNavigationInput {
  /** L'app gira installata (`display-mode: standalone`). */
  standalone: boolean;
  /** Percorso della pagina corrente. */
  currentPath: string;
  /** Percorso della scheda toccata. */
  target: string;
  /** Percorso della voce di cronologia precedente, se si conosce. */
  previousPath: string | null;
}

const HOME = "/";

export function tabNavigationAction({
  standalone,
  currentPath,
  target,
  previousPath,
}: TabNavigationInput): TabNavigationAction {
  if (!standalone) return { kind: "push", href: target };
  if (target === HOME) {
    return previousPath === HOME ? { kind: "back" } : { kind: "replace", href: HOME };
  }
  if (currentPath === HOME) return { kind: "push", href: target };
  return { kind: "replace", href: target };
}

/** L'app è aperta dall'icona installata (Android, desktop o iOS). */
export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari espone questo flag non standard
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

interface NavigationHistoryEntry {
  url: string | null;
  index: number;
}

interface NavigationApi {
  currentEntry: NavigationHistoryEntry | null;
  entries(): NavigationHistoryEntry[];
}

/**
 * Percorso della voce di cronologia precedente, dalla Navigation API (Chrome,
 * quindi le app installate su Android). Dove non c'è restituisce `null` e la
 * Home sostituisce la voce corrente: su iOS l'app installata non ha un gesto
 * indietro di sistema, quindi non cambia nulla.
 */
export function previousHistoryPath(): string | null {
  if (typeof window === "undefined") return null;
  const nav = (window as Window & { navigation?: NavigationApi }).navigation;
  const current = nav?.currentEntry;
  if (!nav || !current || current.index < 1) return null;
  const previous = nav.entries()[current.index - 1];
  if (!previous?.url) return null;
  try {
    const url = new URL(previous.url);
    // Solo voci di questo sito: una pagina esterna non è "la Home".
    return url.origin === window.location.origin ? url.pathname : null;
  } catch {
    return null;
  }
}
