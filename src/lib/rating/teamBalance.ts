import { TRUESKILL, defaultRating, normCdf, type Rating } from "./trueskill";
import { formationStrength } from "./staffLevel";

/**
 * Equilibrio fra le squadre di un allenamento, per lo staff (UX-54).
 *
 * In allenamento le squadre hanno spesso un giocatore in più o in meno, che
 * ruota e non gioca in sette: sommare i livelli premierebbe la squadra più
 * numerosa. Ogni squadra si legge quindi come una formazione di sei in campo
 * col livello medio dei suoi giocatori, e la probabilità di vittoria è quella
 * TrueSkill fra le due formazioni. Chi non ha un livello stimato conta al
 * livello di partenza, come nella generazione delle squadre.
 */

/** Giocatori in campo per squadra nel Baskin. */
const ON_COURT = 6;

/**
 * Sotto questo numero di giocatori la forza di una squadra non si mostra: con
 * uno o due giocatori sarebbe il livello di una persona, che allo staff non si
 * dice mai con un numero (UX-40). Lo stesso vale per la percentuale.
 */
export const MIN_TEAM_SIZE = 3;

/** Fra questi due valori le squadre si dicono equilibrate. */
export const BALANCED_RANGE = { lo: 0.42, hi: 0.58 } as const;

function meanRating(team: Rating[]): Rating {
  const players = team.length > 0 ? team : [defaultRating()];
  const mu = players.reduce((s, r) => s + r.mu, 0) / players.length;
  // Varianza della media: Σσ² / n².
  const variance = players.reduce((s, r) => s + r.sigma * r.sigma, 0) / players.length ** 2;
  return { mu, sigma: Math.sqrt(variance) };
}

/** Probabilità che la prima squadra batta la seconda. */
export function teamWinProbability(a: Rating[], b: Rating[]): number {
  const ma = meanRating(a);
  const mb = meanRating(b);
  const delta = ON_COURT * (ma.mu - mb.mu);
  const variance =
    2 * ON_COURT * TRUESKILL.BETA ** 2 + ON_COURT ** 2 * (ma.sigma ** 2 + mb.sigma ** 2);
  return normCdf(delta / Math.sqrt(variance));
}

export interface TeamBalance {
  /** Forza di ogni squadra: il livello medio, intero (`formationStrength`).
   *  Null sotto `MIN_TEAM_SIZE` giocatori. */
  strengths: (number | null)[];
  /** Solo con due squadre di almeno `MIN_TEAM_SIZE`: probabilità di vittoria
   *  di ciascuna, somma 1. */
  winProbabilities: [number, number] | null;
  /** Indice della squadra favorita, null se equilibrate (o con tre squadre). */
  favourite: number | null;
  /** Giocatori senza livello stimato, contati al livello di partenza. */
  unrated: number;
}

/** `levelOf` restituisce null per chi non ha un livello stimato. */
export function teamBalance(
  teams: { id: string }[][],
  levelOf: (id: string) => Rating | null
): TeamBalance {
  let unrated = 0;
  const ratings = teams.map((team) =>
    team.map((a) => {
      const r = levelOf(a.id);
      if (!r) unrated++;
      return r ?? defaultRating();
    })
  );
  const strengths = ratings.map((team) =>
    team.length < MIN_TEAM_SIZE
      ? null
      : formationStrength(
          team.reduce((s, r) => s + r.mu, 0),
          team.length
        )
  );
  if (teams.length !== 2 || strengths.some((s) => s === null)) {
    return { strengths, winProbabilities: null, favourite: null, unrated };
  }
  const p = teamWinProbability(ratings[0], ratings[1]);
  const favourite = p > BALANCED_RANGE.hi ? 0 : p < BALANCED_RANGE.lo ? 1 : null;
  return { strengths, winProbabilities: [p, 1 - p], favourite, unrated };
}

/** Percentuali intere che sommano a 100. */
export function percentPair([a]: [number, number]): [number, number] {
  const pa = Math.round(a * 100);
  return [pa, 100 - pa];
}
