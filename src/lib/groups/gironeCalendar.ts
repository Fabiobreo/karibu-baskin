import type { MatchResult } from "@prisma/client";

/** Tipi condivisi dalla pagina del girone in admin. */

export interface GironeTeam {
  id: string;
  name: string;
  season: string;
  color: string | null;
}

export interface GironeOpponent {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
}

/** Una nostra partita del girone: si gestisce in Partite. */
export interface GironeOurMatch {
  id: string;
  slug: string | null;
  date: string;
  isHome: boolean;
  matchday: number | null;
  ourScore: number | null;
  theirScore: number | null;
  result: MatchResult | null;
  teamId: string;
  opponent: { id: string; name: string; slug: string | null } | null;
  _count: { playerStats: number };
}

/** Una partita fra due avversarie del girone. */
export interface GironeOtherMatch {
  id: string;
  matchday: number | null;
  date: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { id: string; name: string; slug: string | null };
  awayTeam: { id: string; name: string; slug: string | null };
}

/** Una riga del calendario unico: nostra o delle altre. */
export type CalendarEntry =
  | { kind: "ours"; date: string | null; matchday: number | null; match: GironeOurMatch }
  | { kind: "other"; date: string | null; matchday: number | null; match: GironeOtherMatch };

export interface CalendarDay {
  matchday: number | null;
  entries: CalendarEntry[];
}

/**
 * Le partite del girone, nostre e delle altre, per giornata e poi per data.
 * Le partite senza giornata stanno in fondo, in un gruppo a parte.
 */
export function buildCalendar(
  ours: ReadonlyArray<GironeOurMatch>,
  others: ReadonlyArray<GironeOtherMatch>
): CalendarDay[] {
  const entries: CalendarEntry[] = [
    ...ours.map((m) => ({ kind: "ours" as const, date: m.date, matchday: m.matchday, match: m })),
    ...others.map((m) => ({
      kind: "other" as const,
      date: m.date,
      matchday: m.matchday,
      match: m,
    })),
  ];
  const byDay = new Map<number | null, CalendarEntry[]>();
  for (const e of entries) {
    const list = byDay.get(e.matchday) ?? [];
    list.push(e);
    byDay.set(e.matchday, list);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity))
    .map(([matchday, list]) => ({
      matchday,
      entries: list.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
    }));
}
