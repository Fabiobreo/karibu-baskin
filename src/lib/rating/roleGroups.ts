// ── Gruppi di ruolo del tracker "Sviluppo giocatori" ─────────────────────────
//
// Il livello stimato nasce dai risultati della squadra, e il peso di un ruolo 1
// su una partitella non è quello di un ruolo 5: i giocatori si confrontano
// dentro il proprio ruolo. Ruoli 1 e 2 stanno insieme perché sono pochi e da
// soli darebbero medie che saltano a ogni partita.

export type RoleGroup = "1-2" | "3" | "4" | "5" | "none";

export const ROLE_GROUPS: RoleGroup[] = ["1-2", "3", "4", "5", "none"];

export const ROLE_GROUP_LABELS: Record<RoleGroup, string> = {
  "1-2": "Ruoli 1 e 2",
  "3": "Ruolo 3",
  "4": "Ruolo 4",
  "5": "Ruolo 5",
  none: "Senza ruolo",
};

/** Come si chiama la riga di riferimento del gruppo, nella legenda del dettaglio. */
export const ROLE_GROUP_MEAN_LABELS: Record<RoleGroup, string> = {
  "1-2": "la media dei ruoli 1 e 2",
  "3": "la media del ruolo 3",
  "4": "la media del ruolo 4",
  "5": "la media del ruolo 5",
  none: "la media di chi non ha un ruolo",
};

/** Ruoli Baskin del gruppo, per i badge nell'intestazione. */
export const ROLE_GROUP_ROLES: Record<RoleGroup, number[]> = {
  "1-2": [1, 2],
  "3": [3],
  "4": [4],
  "5": [5],
  none: [],
};

export function roleGroupOf(sportRole: number | null): RoleGroup {
  if (sportRole === 1 || sportRole === 2) return "1-2";
  if (sportRole === 3 || sportRole === 4 || sportRole === 5) return String(sportRole) as RoleGroup;
  return "none";
}

/** Curve leggibili sotto le quali la media del gruppo non è affidabile. */
export const MIN_FOR_GROUP_REFERENCE = 3;

/**
 * Livello medio di riferimento di un gruppo: la media di chi ha la curva
 * leggibile. Con meno di `MIN_FOR_GROUP_REFERENCE` curve si ripiega sulla
 * media della rosa (`fallback`) e lo si dice (`own: false`).
 */
export function groupReference(
  measuredMus: number[],
  fallback: number
): { value: number; own: boolean } {
  if (measuredMus.length < MIN_FOR_GROUP_REFERENCE) return { value: fallback, own: false };
  return { value: measuredMus.reduce((s, v) => s + v, 0) / measuredMus.length, own: true };
}

/** Soglie a terzili di una lista di valori (null con meno di 3 valori). */
export function tercileThresholds(values: number[]): { lo: number; hi: number } | null {
  if (values.length < 3) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    lo: sorted[Math.floor(sorted.length / 3)],
    hi: sorted[Math.floor((2 * sorted.length) / 3)],
  };
}
