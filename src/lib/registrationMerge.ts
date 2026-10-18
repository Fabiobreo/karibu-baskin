/**
 * Fusione di un'iscrizione anonima nell'iscrizione con l'account della stessa
 * persona, allo stesso allenamento.
 *
 * Succede a chi si è iscritto prima di avere un account (o senza aver fatto
 * l'accesso) e poi si è iscritto di nuovo con l'account: la stessa persona
 * compare due volte. Collegando l'anonima dal profilo, l'iscrizione con
 * l'account resta e l'anonima sparisce, portandosi dietro quello che sapeva in
 * più (presenza segnata dallo staff, nota).
 */

export interface MergeableRegistration {
  id: string;
  attended: boolean | null;
  note: string | null;
}

/**
 * Campi da scrivere sull'iscrizione che resta: quelli che le mancano e che
 * l'anonima ha. Quello che lo staff ha già segnato sull'iscrizione con
 * l'account non si tocca. Vuoto se non c'è niente da portare.
 */
export function mergedFields(
  kept: MergeableRegistration,
  anonymous: MergeableRegistration
): { attended?: boolean; note?: string } {
  const out: { attended?: boolean; note?: string } = {};
  if (kept.attended === null && anonymous.attended !== null) out.attended = anonymous.attended;
  if (!kept.note && anonymous.note) out.note = anonymous.note;
  return out;
}

interface WithId {
  id: string;
}

const TEAM_LISTS = ["teamA", "teamB", "teamC", "coaches"] as const;

/**
 * Le squadre salvate di un allenamento (`TrainingSession.teams`) indicano gli
 * atleti con l'id dell'iscrizione. Quando l'anonima sparisce il suo posto passa
 * all'iscrizione che resta; se quella è già in squadra, l'anonima si toglie e
 * basta (la persona non può stare in due squadre).
 *
 * `changed: false` quando le squadre non nominano l'anonima: niente da salvare.
 */
export function replaceRegistrationInTeams(
  teams: unknown,
  fromId: string,
  toId: string
): { changed: boolean; teams: unknown } {
  if (!teams || typeof teams !== "object" || Array.isArray(teams)) {
    return { changed: false, teams };
  }
  const source = teams as Record<string, unknown>;
  const lists = TEAM_LISTS.map((key) => source[key]).filter((l): l is WithId[] => Array.isArray(l));
  const mentionsFrom = lists.some((l) => l.some((a) => a?.id === fromId));
  if (!mentionsFrom) return { changed: false, teams };

  const keptAlreadyIn = lists.some((l) => l.some((a) => a?.id === toId));
  const next: Record<string, unknown> = { ...source };
  for (const key of TEAM_LISTS) {
    const list = source[key];
    if (!Array.isArray(list)) continue;
    next[key] = keptAlreadyIn
      ? list.filter((a: WithId) => a?.id !== fromId)
      : list.map((a: WithId) => (a?.id === fromId ? { ...a, id: toId } : a));
  }
  return { changed: true, teams: next };
}
