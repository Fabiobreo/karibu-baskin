import { computeBadges, type Badge, type StatsInput } from "@/lib/rating/badges";

/**
 * Traguardi sbloccati con una partita (UX-58): quelli che il giocatore ha
 * contando le partite fino a questa, e non contando solo quelle di prima.
 *
 * Il database non dice con quale partita è arrivato un traguardo (`EarnedBadge`
 * ha solo il momento in cui è stato registrato, che per lo storico è il giorno
 * del backfill), quindi si ricalcola: il risultato non cambia se le statistiche
 * sono state salvate in ritardo, né se dopo sono arrivate altre partite.
 *
 * `mvpDates` sono le date delle partite in cui è stato MVP. I traguardi di
 * stagione (primo marcatore) non dipendono da una partita sola: restano fuori,
 * perché lo stesso `topScorerCount` vale prima e dopo.
 */
export function badgesUnlockedByMatch(
  input: StatsInput,
  mvpDates: Date[],
  matchDate: Date
): Badge[] {
  const at = matchDate.getTime();
  const after: StatsInput = {
    ...input,
    matchStats: input.matchStats.filter((m) => m.date.getTime() <= at),
    mvpCount: mvpDates.filter((d) => d.getTime() <= at).length,
  };
  const before: StatsInput = {
    ...input,
    matchStats: input.matchStats.filter((m) => m.date.getTime() < at),
    mvpCount: mvpDates.filter((d) => d.getTime() < at).length,
  };
  const had = new Set(computeBadges(before).map((b) => b.id));
  return computeBadges(after).filter((b) => !had.has(b.id));
}
