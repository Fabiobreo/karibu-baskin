import { shootingAccuracy } from "@/lib/matches/accuracy";

/**
 * Logica pura della classifica marcatori (`/marcatori`, `ClassificaInternaTable`):
 * totali con i prestiti, ordinamento, filtri e le due etichette che dipendono
 * dallo stato (bottone "Filtri" su telefono, prestito nella colonna Giocate).
 */

export interface PlayerStatRow {
  /** Id del giocatore (User o Child). */
  id: string;
  kind: "user" | "child";
  name: string | null;
  image: string | null;
  slug: string | null;
  sportRole: number | null;
  sportRoleVariant: string | null;
  matches: number;
  points: number;
  twoPointers: number;
  threePointers: number;
  freeThrows: number;
  fouls: number;
  illegalFouls: number;
  shotsAttempted: number;
  /** Premi MVP ricevuti nella stagione (non splittato prestito/principale). */
  mvpCount: number;
  teams: { id: string; name: string; color: string | null }[];
  // Quote "in prestito": partite/punti/tiri fatti giocando per una squadra
  // diversa dalla propria. Sommate al valore principale danno il totale.
  loanMatches: number;
  loanPoints: number;
  loanTwoPointers: number;
  loanThreePointers: number;
  loanFreeThrows: number;
  loanFouls: number;
  loanIllegalFouls: number;
  loanShotsAttempted: number;
}

export type ScorerSortKey =
  | "matches"
  | "points"
  | "twoPointers"
  | "threePointers"
  | "freeThrows"
  | "fouls"
  | "illegalFouls"
  | "shotsAttempted"
  | "avgPoints"
  | "accuracy"
  | "mvp";

/** Canestri di tutta la stagione (1+2+3), prestiti inclusi. */
export function madeTotal(row: PlayerStatRow): number {
  return (
    row.freeThrows +
    row.twoPointers +
    row.threePointers +
    row.loanFreeThrows +
    row.loanTwoPointers +
    row.loanThreePointers
  );
}

/** Tiri tentati di tutta la stagione, prestiti inclusi. */
export function attemptedTotal(row: PlayerStatRow): number {
  return row.shotsAttempted + row.loanShotsAttempted;
}

/** Media punti a partita sul totale (prestiti inclusi); 0 senza partite. */
export function averagePoints(row: PlayerStatRow): number {
  const totMatches = row.matches + row.loanMatches;
  return totMatches > 0 ? (row.points + row.loanPoints) / totMatches : 0;
}

/**
 * Valore totale di una colonna, quello che si mostra in grande e su cui si
 * ordina: parte propria più parte in prestito.
 */
export function columnTotal(row: PlayerStatRow, col: ScorerSortKey): number {
  switch (col) {
    case "matches":
      return row.matches + row.loanMatches;
    case "points":
      return row.points + row.loanPoints;
    case "twoPointers":
      return row.twoPointers + row.loanTwoPointers;
    case "threePointers":
      return row.threePointers + row.loanThreePointers;
    case "freeThrows":
      return row.freeThrows + row.loanFreeThrows;
    case "fouls":
      return row.fouls + row.loanFouls;
    case "illegalFouls":
      return row.illegalFouls + row.loanIllegalFouls;
    case "shotsAttempted":
      return attemptedTotal(row);
    case "avgPoints":
      return averagePoints(row);
    case "accuracy":
      // Senza percentuale valida (dato incompleto) si ordina come 0.
      return shootingAccuracy(madeTotal(row), attemptedTotal(row)) ?? 0;
    case "mvp":
      // MVP non è tracciato come prestito.
      return row.mvpCount;
  }
}

/** Ordina sul totale della colonna, senza toccare l'array in ingresso. */
export function sortScorers(
  rows: PlayerStatRow[],
  col: ScorerSortKey,
  dir: "asc" | "desc"
): PlayerStatRow[] {
  return [...rows].sort((a, b) => {
    const diff = columnTotal(a, col) - columnTotal(b, col);
    return dir === "asc" ? diff : -diff;
  });
}

/** Filtro per ruolo Baskin (null = tutti) e per nome (senza maiuscole). */
export function filterScorers(
  rows: PlayerStatRow[],
  role: number | null,
  search: string
): PlayerStatRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (role === null || r.sportRole === role) &&
      (q === "" || (r.name ?? "").toLowerCase().includes(q))
  );
}

/** Qualche giocatore ha partite in prestito? Allora serve la nota in fondo. */
export function hasAnyLoan(rows: PlayerStatRow[]): boolean {
  return rows.some((r) => r.loanMatches > 0);
}

/**
 * Etichetta del bottone "Filtri" su telefono (UX-48): dice il filtro attivo,
 * così a pannello chiuso si capisce perché la lista è più corta.
 * `"Filtri"` oppure `"Filtri · Ruolo 3"`.
 */
export function filtersButtonLabel(base: string, activeFilter: string | null): string {
  return activeFilter ? `${base} · ${activeFilter}` : base;
}

/**
 * Nota di prestito della riga (UX-48): sta solo nella colonna Giocate
 * ("7 · 2 in prestito"), mai accanto al nome né sotto gli altri numeri.
 * `null` se il giocatore non ha partite in prestito. `loanText` dà la stringa
 * tradotta ("2 in prestito").
 */
export function matchesLoanNote(
  row: PlayerStatRow,
  loanText: (count: number) => string
): string | null {
  return row.loanMatches > 0 ? loanText(row.loanMatches) : null;
}
