/**
 * Restituisce la stringa stagione (es. "2025-26") per una data.
 * La stagione inizia a settembre (mese indice 8).
 * Aug 2025 → "2024-25", Sep 2025 → "2025-26"
 */
export function getCurrentSeason(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const s = d.getMonth() >= 8 ? y : y - 1;
  return `${s}-${String(s + 1).slice(-2)}`;
}

/**
 * Restituisce il 1° agosto dell'anno di inizio stagione per una data.
 * Usato per filtrare le sessioni di allenamento (pre-season inizia ad agosto).
 */
export function getSeasonStartDate(date: Date = new Date()): Date {
  const y = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return new Date(y, 7, 1);
}

// ── Stagione attiva ──────────────────────────────────────────────────────────
// Il sito ha una sola definizione di "stagione corrente": la stagione marcata
// `isCurrent` a database (lo staff sa quando la stagione comincia davvero), con
// `getCurrentSeason()` come ripiego quando nessuna è marcata.
//
// `resolveActiveSeason()` è la parte pura e testabile della logica: il wrapper
// che interroga il DB è `getActiveSeason()` in `./activeSeason` (non può stare
// qui perché questo modulo è importato anche da componenti client).

export interface ResolveActiveSeasonInput {
  /** Etichette delle stagioni marcate `isCurrent` a DB (di norma zero o una). */
  markedSeasons: string[];
  /** Stagioni che hanno dati, dalla più recente alla più vecchia. */
  seasonsWithData: string[];
  /** Data di riferimento per il ripiego sul calendario. */
  now?: Date;
}

export interface ActiveSeason {
  /** La stagione corrente: quella marcata dallo staff o, in mancanza, il calendario. */
  activeSeason: string;
  /** La stagione effettivamente da mostrare: la attiva, o l'ultima popolata se la attiva è vuota. */
  displaySeason: string;
  /** true quando si mostra una stagione diversa da quella attiva perché la attiva è vuota. */
  isFallback: boolean;
  /** Stagioni per i chip filtro: quelle con dati più la attiva, sempre presente, in ordine decrescente. */
  seasons: string[];
  /** false quando nessuna stagione ha dati: la pagina è vuota per davvero, non solo a inizio stagione. */
  hasAnyData: boolean;
}

export function resolveActiveSeason({
  markedSeasons,
  seasonsWithData,
  now,
}: ResolveActiveSeasonInput): ActiveSeason {
  const activeSeason = markedSeasons[0] ?? getCurrentSeason(now ?? new Date());
  const withData = seasonsWithData.filter((s) => !!s);

  // La stagione attiva è sempre rappresentata fra i chip, anche se non ha dati:
  // senza il suo chip l'utente non potrebbe tornarci dopo una ricaduta.
  const seasons = Array.from(new Set([activeSeason, ...withData])).sort((a, b) =>
    b.localeCompare(a)
  );

  const activeHasData = withData.includes(activeSeason);
  const displaySeason = activeHasData ? activeSeason : (withData[0] ?? activeSeason);

  return {
    activeSeason,
    displaySeason,
    isFallback: displaySeason !== activeSeason,
    seasons,
    hasAnyData: withData.length > 0,
  };
}
