/**
 * Logica pura della chiusura di un allenamento in admin (UX-13): presenze e
 * punteggi delle partitelle si raccolgono in locale e si salvano insieme.
 */

export type Attended = boolean | null;
export type MatchupKey = "AB" | "AC" | "BC";

export interface SavedResult {
  id: string;
  matchup: string | null;
  scoreA: number;
  scoreB: number;
}

/** Punteggi scritti dallo staff: stringhe, perche' vengono da campi di testo. */
export interface ScoreDraft {
  a: string;
  b: string;
}

/** Partitelle attese: una con due squadre, tre (tutte le coppie) con tre. */
export function expectedMatchups(teamCount: number): MatchupKey[] {
  if (teamCount >= 3) return ["AB", "AC", "BC"];
  if (teamCount === 2) return ["AB"];
  return [];
}

/** Presenze da salvare: solo quelle diverse dal valore gia' a database. */
export function attendanceChanges(
  athletes: { id: string; attended: Attended }[],
  draft: Record<string, Attended>
): { regId: string; attended: Attended }[] {
  return athletes
    .filter((a) => a.id in draft && draft[a.id] !== a.attended)
    .map((a) => ({ regId: a.id, attended: draft[a.id] }));
}

function parseScore(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  if (!/^\d+$/.test(t)) return NaN;
  return Number(t);
}

export interface ResultOps {
  create: { matchup: MatchupKey; scoreA: number; scoreB: number }[];
  update: { id: string; matchup: MatchupKey; scoreA: number; scoreB: number }[];
  remove: { id: string; matchup: MatchupKey }[];
  /** Partitelle con un solo punteggio o un valore non numerico. */
  invalid: MatchupKey[];
}

/**
 * Operazioni sui risultati: si crea o si aggiorna quando entrambi i punteggi
 * ci sono, si cancella un risultato salvato quando entrambi i campi vengono
 * svuotati, niente quando nulla e' cambiato.
 */
export function resultOps(
  matchups: MatchupKey[],
  saved: SavedResult[],
  drafts: Partial<Record<MatchupKey, ScoreDraft>>
): ResultOps {
  const ops: ResultOps = { create: [], update: [], remove: [], invalid: [] };
  for (const m of matchups) {
    const draft = drafts[m];
    if (!draft) continue;
    const existing = saved.find((r) => r.matchup === m);
    const a = parseScore(draft.a);
    const b = parseScore(draft.b);
    if (a === null && b === null) {
      if (existing) ops.remove.push({ id: existing.id, matchup: m });
      continue;
    }
    if (a === null || b === null || Number.isNaN(a) || Number.isNaN(b)) {
      ops.invalid.push(m);
      continue;
    }
    if (!existing) ops.create.push({ matchup: m, scoreA: a, scoreB: b });
    else if (existing.scoreA !== a || existing.scoreB !== b)
      ops.update.push({ id: existing.id, matchup: m, scoreA: a, scoreB: b });
  }
  return ops;
}

/** Cosa manca a un allenamento, per la riga chiusa della lista. */
export function closeStatus(
  athletes: { attended: Attended }[],
  expectedResults: number,
  savedResults: number
): { unmarked: number; missingResults: number } {
  return {
    unmarked: athletes.filter((a) => a.attended === null).length,
    missingResults: Math.max(0, expectedResults - savedResults),
  };
}
