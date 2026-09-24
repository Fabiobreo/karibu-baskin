/**
 * Preferenza "righe per pagina" delle tabelle paginate, una per tabella.
 *
 * Sta in un cookie e non in localStorage perché la lista utenti pagina lato
 * server: la pagina legge il cookie e serve subito il numero di righe giusto.
 * Le tabelle paginate nel browser la leggono con `useRowsPerPage`.
 */

/** Chiavi delle tabelle: una preferenza ciascuna. */
export type RowsPerPageTable =
  | "users"
  | "children"
  | "anonymous-registrations"
  | "opponents"
  | "events"
  | "groups"
  | "matches"
  | "audit"
  | "match-stats"
  | "internal-standings";

const ONE_YEAR = 60 * 60 * 24 * 365;

export function rowsPerPageCookieName(table: RowsPerPageTable): string {
  return `karibu-rows-${table}`;
}

/** Il valore salvato, se è tra le opzioni della tabella; altrimenti `fallback`. */
export function parseRowsPerPage(
  raw: string | undefined | null,
  options: readonly number[],
  fallback: number
): number {
  const n = Number(raw);
  return Number.isInteger(n) && options.includes(n) ? n : fallback;
}

/** Legge la preferenza dai cookie del browser (solo client). */
export function readRowsPerPageCookie(table: RowsPerPageTable): string | undefined {
  if (typeof document === "undefined") return undefined;
  const name = `${rowsPerPageCookieName(table)}=`;
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(name))
    ?.slice(name.length);
}

export function writeRowsPerPageCookie(table: RowsPerPageTable, value: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${rowsPerPageCookieName(table)}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}
