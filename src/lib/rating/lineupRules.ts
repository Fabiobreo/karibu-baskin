// ── Regole formazione Baskin (vincolo A, 6 giocatori in campo) ────────────────
//
// Fonte di verità condivisa per la validità di una formazione, usata sia
// dall'ottimizzatore formazioni (lineupOptimizer) sia dal simulatore sfida.
//
// Vincoli (regolamento ufficiale):
//   1. Esattamente 6 giocatori in campo.
//   2. Esattamente 1 Pivot, cioè 1 giocatore tra ruolo 1 e ruolo 2.
//   3. Somma dei numeri di ruolo ≤ 23.
//   4. Tra i giocatori di ruolo 4 e 5 in campo: almeno una donna E almeno un
//      uomo (vincolo vacuamente soddisfatto se non ci sono R4/R5).
//   5. Almeno 1 giocatore di ruolo 3.
//   6. Almeno 2 giocatori di ruolo 5.

export const LINEUP_SIZE = 6;
export const MAX_ROLE_SUM = 23;

export interface LineupPlayerLike {
  sportRole: number | null;
  gender: "MALE" | "FEMALE" | null;
}

export interface LineupChecks {
  /** Numero di giocatori attualmente in formazione. */
  count: number;
  /** count === 6 */
  full: boolean;
  /** Esattamente 1 giocatore di ruolo 1 o 2. */
  oneGuard: boolean;
  /** Somma dei ruoli. */
  roleSum: number;
  /** roleSum ≤ 23 */
  roleSumOk: boolean;
  /** Tra R4+R5: ≥1 donna e ≥1 uomo (vacuo se nessun R4/R5). */
  genderMix: boolean;
  /** Almeno 1 giocatore di ruolo 3. */
  hasThree: boolean;
  /** Almeno 2 giocatori di ruolo 5. */
  twoFives: boolean;
  /** Tutti i vincoli soddisfatti (formazione schierabile). */
  valid: boolean;
}

/** Valuta una formazione restituendo l'esito di ogni singolo vincolo. */
export function validateLineup(players: LineupPlayerLike[]): LineupChecks {
  const count = players.length;
  const full = count === LINEUP_SIZE;

  const guards = players.filter((p) => p.sportRole === 1 || p.sportRole === 2).length;
  const oneGuard = guards === 1;

  const roleSum = players.reduce((s, p) => s + (p.sportRole ?? 0), 0);
  const roleSumOk = roleSum <= MAX_ROLE_SUM;

  const high = players.filter((p) => p.sportRole === 4 || p.sportRole === 5);
  const genderMix =
    high.length === 0 ||
    (high.some((p) => p.gender === "FEMALE") && high.some((p) => p.gender === "MALE"));

  const hasThree = players.filter((p) => p.sportRole === 3).length >= 1;
  const twoFives = players.filter((p) => p.sportRole === 5).length >= 2;

  const valid = full && oneGuard && roleSumOk && genderMix && hasThree && twoFives;

  return { count, full, oneGuard, roleSum, roleSumOk, genderMix, hasThree, twoFives, valid };
}

/** Scorciatoia booleana: la formazione è schierabile secondo il regolamento. */
export function isLineupValid(players: LineupPlayerLike[]): boolean {
  return validateLineup(players).valid;
}

/**
 * Indica se aggiungere `candidate` alla formazione `current` è una mossa lecita,
 * cioè non rende la squadra non valida. Usato per disabilitare le scelte
 * impossibili nel simulatore.
 *
 * Blocca:
 * - formazione già completa (6 giocatori);
 * - somma ruoli che supererebbe 23 (vincolo monotòno);
 * - un secondo giocatore di ruolo 1 o 2 (vincolo monotòno);
 * - il 6° (ultimo) giocatore se la formazione risultante non è valida a tutti
 *   gli effetti (es. resterebbe senza Pivot, senza mix di genere R4/R5, senza
 *   un ruolo 3 o con meno di 2 ruoli 5).
 */
export function canAddToLineup(current: LineupPlayerLike[], candidate: LineupPlayerLike): boolean {
  if (current.length >= LINEUP_SIZE) return false;

  const prospective = [...current, candidate];

  const sum = prospective.reduce((s, p) => s + (p.sportRole ?? 0), 0);
  if (sum > MAX_ROLE_SUM) return false;

  const guards = prospective.filter((p) => p.sportRole === 1 || p.sportRole === 2).length;
  if (guards > 1) return false;

  if (prospective.length === LINEUP_SIZE && !validateLineup(prospective).valid) return false;

  return true;
}
