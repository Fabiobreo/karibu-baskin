/**
 * Il riquadro "Avversaria" delle convocazioni: cosa dice la scheda, in parole,
 * e i due suggerimenti per ruolo.
 *
 * I suggerimenti non confrontano i nostri con i loro: "forti" messo a occhio e
 * il livello stimato dei nostri non stanno sulla stessa scala. La scheda dice
 * solo dove guardare; il confronto è fra i nostri convocati e i nostri
 * disponibili. Non toccano il calcolo della formazione consigliata e non fanno
 * nomi: portano all'elenco di quel ruolo, e sceglie l'allenatore. Chi ha detto
 * che non c'è non si suggerisce mai; chi non ha risposto sì, ma dicendolo.
 */
import { TRUESKILL } from "@/lib/rating/trueskill";
import type { CategoryAssessment, OpponentProfile } from "@/lib/schemas/match";

/**
 * Quanto deve essere più alto il livello stimato di un disponibile rispetto a
 * un convocato perché valga la pena dirlo: una "classe" di livello (β). Sotto,
 * la differenza sta dentro l'incertezza della stima.
 */
export const LEVEL_GAP = TRUESKILL.BETA;

/** Convocazioni in stagione di differenza perché uno abbia "giocato meno". */
export const ROTATION_GAP = 2;

/** `stronger`: loro forti, c'è di meglio fra i disponibili. `rotation`: loro deboli, spazio a chi ha giocato meno. */
export type RoleHintKind = "stronger" | "rotation";

export interface RoleHint {
  role: number;
  kind: RoleHintKind;
  /**
   * Fra chi ha detto che c'è non c'è nessuno da suggerire: il suggerimento
   * parla di chi non ha ancora risposto, e lo dice.
   */
  unconfirmed: boolean;
  text: string;
  /** Etichetta del bottone che porta all'elenco di quel ruolo. */
  action: string;
}

/** Quello che serve sapere di un candidato per i suggerimenti. */
export interface HintCandidate {
  sportRole: number | null;
  /** Livello stimato; null = non ancora valutato, resta fuori dal confronto. */
  ratingMu: number | null;
  seasonCallups: number;
  /** true = ha detto che c'è, null = non ha risposto, false = non c'è (mai suggerito). */
  availability: boolean | null;
  selected: boolean;
}

function hintFor(role: number, kind: RoleHintKind, unconfirmed: boolean): RoleHint {
  const text =
    kind === "stronger"
      ? unconfirmed
        ? `I loro ${role} sono forti. Fra chi non ha ancora risposto c'è un ${role} che potrebbe reggere meglio il confronto: va sentito.`
        : `I loro ${role} sono forti. Fra i disponibili c'è un ${role} che potrebbe reggere meglio il confronto.`
      : unconfirmed
        ? `I loro ${role} sono deboli: buona occasione per dare spazio a chi ha giocato meno. Chi ha giocato meno non ha ancora risposto: va sentito.`
        : `I loro ${role} sono deboli: buona occasione per dare spazio a chi ha giocato meno.`;
  return { role, kind, unconfirmed, text, action: `Vedi i ${role}` };
}

/** C'è nel gruppo qualcuno che vale il suggerimento, rispetto ai convocati del ruolo? */
function worthSuggesting(
  strength: "STRONG" | "WEAK",
  called: HintCandidate[],
  bench: HintCandidate[]
): boolean {
  if (called.length === 0 || bench.length === 0) return false;
  if (strength === "STRONG") {
    const calledMus = called.flatMap((c) => (c.ratingMu != null ? [c.ratingMu] : []));
    const benchMus = bench.flatMap((c) => (c.ratingMu != null ? [c.ratingMu] : []));
    if (calledMus.length === 0 || benchMus.length === 0) return false;
    return Math.max(...benchMus) - Math.min(...calledMus) >= LEVEL_GAP;
  }
  const mostCalled = Math.max(...called.map((c) => c.seasonCallups));
  const leastCalled = Math.min(...bench.map((c) => c.seasonCallups));
  return mostCalled - leastCalled >= ROTATION_GAP;
}

/**
 * I suggerimenti per ruolo, al massimo uno per ruolo, in ordine di ruolo.
 * Senza scheda, senza convocati in quel ruolo o senza una differenza netta non
 * ce ne sono. Prima si guarda chi ha detto che c'è; solo se lì non c'è nessuno
 * si guarda chi non ha risposto, e il testo lo dice.
 */
export function roleHints(profile: OpponentProfile, candidates: HintCandidate[]): RoleHint[] {
  if (!profile) return [];
  const hints: RoleHint[] = [];
  for (const key of Object.keys(profile.categories).sort()) {
    const role = Number(key);
    const { strength } = profile.categories[key]!;
    if (strength === "MEDIUM") continue;
    const kind: RoleHintKind = strength === "STRONG" ? "stronger" : "rotation";
    const inRole = candidates.filter((c) => c.sportRole === role);
    const called = inRole.filter((c) => c.selected);
    const bench = inRole.filter((c) => !c.selected);
    const confirmed = bench.filter((c) => c.availability === true);
    const noAnswer = bench.filter((c) => c.availability === null);
    if (worthSuggesting(strength, called, confirmed)) hints.push(hintFor(role, kind, false));
    else if (worthSuggesting(strength, called, noAnswer)) hints.push(hintFor(role, kind, true));
  }
  return hints;
}

/**
 * Un ruolo della scheda in parole ("forti, fisicità alta"), o null se è nella
 * media e senza giocatori segnalati: nel riquadro si leggono solo i ruoli che
 * dicono qualcosa.
 */
export function roleSummary(assessment: CategoryAssessment): string | null {
  const parts: string[] = [];
  if (assessment.strength === "STRONG") parts.push("forti");
  if (assessment.strength === "WEAK") parts.push("deboli");
  if (assessment.physicality === "HIGH") parts.push("fisicità alta");
  if (assessment.physicality === "LOW") parts.push("fisicità bassa");
  if (parts.length > 0) return parts.join(", ");
  return (assessment.players ?? []).length > 0 ? "nella media" : null;
}
