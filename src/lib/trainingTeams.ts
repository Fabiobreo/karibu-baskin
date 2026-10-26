/**
 * Le squadre di un allenamento viste da chi guarda: la sua e quelle dei figli.
 *
 * Le squadre salvate (`TrainingSession.teams`) indicano gli atleti con l'id
 * dell'iscrizione. Prima ogni schermata cercava solo l'iscrizione propria, e
 * un genitore non vedeva in che squadra era il figlio (suggerimento del
 * 15/10/2026). Le iscrizioni "di famiglia" sono quelle della GET
 * `?mine=1`: proprie, dei figli e dei figli con un account.
 */

export type BibKey = "teamA" | "teamB" | "teamC";

const BIB_KEYS: BibKey[] = ["teamA", "teamB", "teamC"];

type TeamsLike = Partial<Record<BibKey, { id: string }[] | undefined>> | null | undefined;

/** Un'iscrizione di chi guarda o della sua famiglia. */
export interface FamilyRegistration {
  id: string;
  name: string;
  /** L'iscrizione è di chi guarda (non di un figlio). */
  self: boolean;
}

export interface FamilyTeam extends FamilyRegistration {
  key: BibKey;
}

/** In che squadra è un'iscrizione, o `null` se non ci sono squadre o non c'è. */
export function teamKeyOf(teams: TeamsLike, registrationId: string): BibKey | null {
  if (!teams) return null;
  return BIB_KEYS.find((k) => teams[k]?.some((a) => a.id === registrationId)) ?? null;
}

/**
 * Le squadre della famiglia, prima chi guarda e poi i figli nell'ordine dato.
 * Restano fuori le iscrizioni senza squadra (allenatori, iscritti dopo).
 */
export function familyTeams(regs: FamilyRegistration[], teams: TeamsLike): FamilyTeam[] {
  const out: FamilyTeam[] = [];
  for (const r of regs) {
    const key = teamKeyOf(teams, r.id);
    if (key) out.push({ ...r, key });
  }
  return out.sort((a, b) => Number(b.self) - Number(a.self));
}

// ── Cambi di squadra e ritardatari (UX-54) ────────────────────────────────────

/** Dove sta ogni iscrizione: id → squadra. */
export type TeamAssignment = Record<string, BibKey>;

/**
 * Nel JSON di `TrainingSession.teams`: l'assegnazione dell'ultimo avviso
 * (UX-54). La scrive solo il server, a ogni avviso; gli avvisi successivi si
 * calcolano contro questa, mai contro un valore mandato dal browser, così due
 * schede aperte o una chiamata ripetuta non avvisano due volte.
 */
export const NOTIFIED_KEY = "notified";

/** L'assegnazione dell'ultimo avviso salvata nelle squadre, se c'è. */
export function notifiedAssignmentOf(teams: unknown): TeamAssignment | null {
  if (!teams || typeof teams !== "object") return null;
  const value = (teams as Record<string, unknown>)[NOTIFIED_KEY];
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: TeamAssignment = {};
  for (const [id, key] of Object.entries(value)) {
    if (key === "teamA" || key === "teamB" || key === "teamC") out[id] = key;
  }
  return out;
}

/** Assegnazione delle squadre salvate (vuota se non ce ne sono). */
export function assignmentOf(teams: TeamsLike): TeamAssignment {
  const out: TeamAssignment = {};
  if (!teams) return out;
  for (const k of BIB_KEYS) for (const a of teams[k] ?? []) out[a.id] = k;
  return out;
}

export interface TeamChanges {
  /** Squadre fatte per la prima volta: si avvisano tutti come prima. */
  initial: boolean;
  /** Entrati in una squadra (prima non c'erano). */
  added: { id: string; key: BibKey }[];
  /** Passati da una squadra a un'altra. */
  moved: { id: string; key: BibKey }[];
}

/**
 * Chi avvisare dopo un cambio di squadre: chi entra e chi cambia squadra.
 * Chi esce dalle squadre non si avvisa. Se prima non c'era nessuno in
 * squadra (nessuna squadra salvata, o squadre vuote da comporre a mano) è la
 * prima volta, e vale l'avviso "Squadre pronte" a tutti.
 */
export function teamChanges(before: TeamAssignment, after: TeamAssignment): TeamChanges {
  const initial = Object.keys(before).length === 0;
  const added: TeamChanges["added"] = [];
  const moved: TeamChanges["moved"] = [];
  for (const [id, key] of Object.entries(after)) {
    const was = before[id];
    if (!was) added.push({ id, key });
    else if (was !== key) moved.push({ id, key });
  }
  return { initial, added, moved };
}

export interface PlaceableAthlete {
  id: string;
  name: string;
  role: number;
}

/**
 * Aggiorna squadre già fatte con chi si è iscritto dopo, senza spostare
 * nessun altro. Esce chi non è più fra gli iscritti che giocano; ogni nuovo
 * entra nella squadra con meno giocatori del suo ruolo, a parità in quella con
 * meno giocatori, a parità in quella col livello totale più basso, poi nella
 * prima. I nuovi entrano dal ruolo più alto, che pesa di più sull'equilibrio.
 */
export function placeLateAthletes<T extends PlaceableAthlete>(
  teams: T[][],
  eligible: T[],
  levelOf: (id: string) => number
): { teams: T[][]; added: { id: string; teamIndex: number }[]; removed: string[] } {
  const eligibleIds = new Set(eligible.map((a) => a.id));
  const removed: string[] = [];
  const next = teams.map((team) =>
    team.filter((a) => {
      if (eligibleIds.has(a.id)) return true;
      removed.push(a.id);
      return false;
    })
  );
  const placed = new Set(next.flat().map((a) => a.id));
  const late = eligible
    .filter((a) => !placed.has(a.id))
    .sort((a, b) => b.role - a.role || a.name.localeCompare(b.name, "it"));

  const added: { id: string; teamIndex: number }[] = [];
  const total = (i: number) => next[i].reduce((s, a) => s + levelOf(a.id), 0);
  for (const athlete of late) {
    let best = 0;
    for (let i = 1; i < next.length; i++) {
      const sameRole = (t: number) => next[t].filter((a) => a.role === athlete.role).length;
      const key = (t: number) => [sameRole(t), next[t].length, total(t)];
      const [r1, n1, l1] = key(i);
      const [r0, n0, l0] = key(best);
      if (r1 < r0 || (r1 === r0 && (n1 < n0 || (n1 === n0 && l1 < l0)))) best = i;
    }
    next[best].push(athlete);
    added.push({ id: athlete.id, teamIndex: best });
  }
  return { teams: next, added, removed };
}
