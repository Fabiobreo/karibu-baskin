import {
  computeBadges,
  type Badge,
  type MatchStat,
  type StatsInput,
  type TrainingRecord,
} from "@/lib/rating/badges";

/**
 * "La tua stagione" (UX-60): il riepilogo personale di fine stagione. Calcoli
 * puri, testati in `seasonRecap.test.ts`; le query stanno in
 * `loadSeasonRecap.ts`.
 *
 * Regola di tono, valida per ogni voce: nessun confronto con gli altri. Ogni
 * numero è della persona e si dice da solo; una voce a zero non c'è.
 */

/** Una partita giocata, con quello che serve alla card "la partita migliore". */
export interface RecapMatchStat extends MatchStat {
  matchId: string;
  slug: string | null;
  /** Nome dell'avversaria (o dell'altra nostra squadra), se si sa. */
  opponentName: string | null;
}

export interface RecapInput {
  /** Tutti gli allenamenti con le presenze segnate, di ogni stagione (`loadTrainingRecords`). */
  trainings: TrainingRecord[];
  /** Tutte le partite giocate, di ogni stagione. */
  matchStats: RecapMatchStat[];
  /** Stagione di ogni partita in cui è stato MVP. */
  mvpSeasons: string[];
  /** Stagioni da 1° marcatore del ruolo (`topScorerSeasons`). */
  topScorerSeasons: string[];
  sportRole: number | null;
  /** Le sue squadre in quella stagione, con la tinta salvata. */
  teams: { name: string; color: string | null }[];
}

/** Numeri del club nella stagione, uguali per tutti. */
export interface ClubSeasonTotals {
  trainings: number;
  matches: number;
  points: number;
}

/** "Quasi sempre", "una bella costanza": la quota si mostra solo se è alta. */
export const SHARE_MIN_RATIO = 2 / 3;
/** …e su abbastanza allenamenti segnati, perché a poche presenze la quota non dice niente. */
export const SHARE_MIN_TRAININGS = 10;
/** Da qui in su la frase è "quasi sempre in palestra". */
export const SHARE_ALWAYS_RATIO = 0.9;

export type TrainingsTone = "always" | "steady" | "lots" | "some";

export interface RecapTrainings {
  attended: number;
  /** Presenze su allenamenti possibili, dal primo a cui è venuto (regola di "Stagione fedele"). */
  share: { attended: number; total: number } | null;
  tone: TrainingsTone;
}

export interface RecapBestMatch {
  matchId: string;
  slug: string | null;
  points: number;
  date: Date;
  opponentName: string | null;
}

export interface RecapMatches {
  played: number;
  points: number;
  /** Solo con almeno due partite e dei punti: con una partita sola sarebbe la stessa card. */
  best: RecapBestMatch | null;
}

export type RecapHighlightKind = "trainings" | "matches" | "points" | "badges";

export interface SeasonRecap {
  season: string;
  teams: { name: string; color: string | null }[];
  trainings: RecapTrainings | null;
  matches: RecapMatches | null;
  /** Volte MVP; null se nessuna. */
  mvp: number | null;
  /** Traguardi arrivati in questa stagione, nell'ordine delle definizioni. */
  badges: Badge[];
  club: ClubSeasonTotals;
  /** C'è almeno una voce personale? Senza, niente avviso e niente card nel profilo. */
  hasData: boolean;
  /** I numeri dell'immagine da condividere: al massimo tre, dal più alto. */
  highlights: { kind: RecapHighlightKind; value: number }[];
}

/** "2026-27" → "2027-28". */
export function nextSeasonLabel(season: string): string {
  const start = Number(season.slice(0, 4)) + 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

/** Presenze di una stagione, contate come "Stagione fedele": dal primo allenamento a cui è venuto. */
export function seasonTrainings(
  trainings: TrainingRecord[],
  season: string
): RecapTrainings | null {
  const sorted = trainings
    .filter((t) => t.season === season)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const first = sorted.findIndex((t) => t.attended);
  if (first < 0) return null;
  const counted = sorted.slice(first);
  const attended = counted.filter((t) => t.attended).length;
  const ratio = attended / counted.length;
  const showShare = counted.length >= SHARE_MIN_TRAININGS && ratio >= SHARE_MIN_RATIO;
  const tone: TrainingsTone = showShare
    ? ratio >= SHARE_ALWAYS_RATIO
      ? "always"
      : "steady"
    : attended >= 20
      ? "lots"
      : "some";
  return {
    attended,
    share: showShare ? { attended, total: counted.length } : null,
    tone,
  };
}

/**
 * Traguardi arrivati nella stagione: quelli che ha contando tutto fino alla
 * stagione compresa, tolti quelli che aveva già prima. Non si legge
 * `EarnedBadge.unlockedAt`, che per lo storico è il giorno del backfill.
 * Le stagioni (e non le date) dicono il prima e il dopo, così "Stagione
 * fedele" e "Top scorer", che arrivano a stagione finita, cadono nella loro.
 */
export function badgesOfSeason(input: RecapInput, season: string): Badge[] {
  const upTo = (include: (s: string) => boolean, currentSeason: string): StatsInput => ({
    matchStats: input.matchStats.filter((m) => include(m.season)),
    trainings: input.trainings.filter((t) => include(t.season)),
    currentSeason,
    mvpCount: input.mvpSeasons.filter(include).length,
    topScorerCount: input.topScorerSeasons.filter(include).length,
    sportRole: input.sportRole,
  });
  const before = upTo((s) => s < season, season);
  const after = upTo((s) => s <= season, nextSeasonLabel(season));
  const had = new Set(computeBadges(before).map((b) => b.id));
  return computeBadges(after).filter((b) => !had.has(b.id));
}

function bestMatch(stats: RecapMatchStat[]): RecapBestMatch | null {
  if (stats.length < 2) return null;
  const best = stats.reduce<RecapMatchStat | null>((top, m) => {
    if (m.points <= 0) return top;
    if (!top || m.points > top.points) return m;
    if (m.points === top.points && m.date.getTime() > top.date.getTime()) return m;
    return top;
  }, null);
  if (!best) return null;
  return {
    matchId: best.matchId,
    slug: best.slug,
    points: best.points,
    date: best.date,
    opponentName: best.opponentName,
  };
}

export function buildSeasonRecap(
  input: RecapInput,
  season: string,
  club: ClubSeasonTotals
): SeasonRecap {
  const trainings = seasonTrainings(input.trainings, season);
  const stats = input.matchStats.filter((m) => m.season === season);
  const points = stats.reduce((sum, m) => sum + m.points, 0);
  const matches: RecapMatches | null =
    stats.length > 0 ? { played: stats.length, points, best: bestMatch(stats) } : null;
  const mvpCount = input.mvpSeasons.filter((s) => s === season).length;
  const badges = badgesOfSeason(input, season);

  const highlights = (
    [
      { kind: "trainings", value: trainings?.attended ?? 0 },
      { kind: "matches", value: matches?.played ?? 0 },
      { kind: "points", value: matches?.points ?? 0 },
      { kind: "badges", value: badges.length },
    ] as const
  )
    .filter((h) => h.value > 0)
    // A parità resta l'ordine della lista: allenamenti, partite, punti, traguardi.
    .map((h, i) => ({ ...h, i }))
    .sort((a, b) => b.value - a.value || a.i - b.i)
    .slice(0, 3)
    .map(({ kind, value }) => ({ kind, value }));

  return {
    season,
    teams: input.teams,
    trainings,
    matches,
    mvp: mvpCount > 0 ? mvpCount : null,
    badges,
    club,
    hasData: trainings != null || matches != null || badges.length > 0,
    highlights,
  };
}

// ── Chi lo vede ──────────────────────────────────────────────────────────────

export type RecapAccess = "ok" | "login" | "notFound";

/**
 * Il riepilogo è privato: la persona e i suoi genitori, dopo la
 * pubblicazione. Allenatori e admin lo vedono sempre, anche prima, per
 * controllare i numeri ("Anteprima riepilogo"). A tutti gli altri la pagina
 * non esiste (404, anche se la persona c'è: non si dice nemmeno questo).
 */
export function recapAccess(opts: {
  published: boolean;
  loggedIn: boolean;
  /** Allenatore o admin (non il dirigente). */
  isStaff: boolean;
  /** `self` il proprio, `guardian` di un figlio, `other` di qualcun altro. */
  relation: "self" | "guardian" | "other";
}): RecapAccess {
  if (!opts.loggedIn) return "login";
  if (opts.isStaff) return "ok";
  if (!opts.published) return "notFound";
  return opts.relation === "other" ? "notFound" : "ok";
}

/**
 * Persona unica (`@/lib/person`): le righe dell'account e della scheda figlio
 * collegata si sommano, ma una partita conta una volta sola anche se, per un
 * collegamento a metà, ha una riga su ciascuna chiave (vale quella con più punti).
 */
export function mergePersonStats(rows: RecapMatchStat[]): RecapMatchStat[] {
  const byMatch = new Map<string, RecapMatchStat>();
  for (const r of rows) {
    const cur = byMatch.get(r.matchId);
    if (!cur || r.points > cur.points) byMatch.set(r.matchId, r);
  }
  return [...byMatch.values()];
}

/**
 * Da aprile alla fine della stagione (agosto) la dashboard ricorda le presenze
 * non segnate: il riepilogo è buono quanto le presenze. Mese di Roma.
 */
export function attendanceReminderDue(now: Date, recapPublished: boolean): boolean {
  if (recapPublished) return false;
  const month = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", month: "numeric" }).format(now)
  );
  return month >= 4 && month <= 8;
}
