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
