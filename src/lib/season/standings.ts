// src/app/classifiche/page.tsx e src/app/api/groups/[groupId]/route.ts.
// Regole del campionato EISI Veneto, ricavate dalla classifica ufficiale
// 2025-26: vittoria 3 punti, sconfitta 1, forfait 0 (la sconfitta a tavolino
// non si registra a parte: qui vale come sconfitta). Il pareggio nel Baskin
// EISI non c'è; se capita vale 2, a metà. A pari punti: scontri diretti fra le
// squadre appaiate (record, poi quoziente canestri), poi quoziente totale.

export type StandingEntry = {
  id: string;
  name: string;
  isOurs: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

type OurMatchInput = {
  ourScore: number | null;
  theirScore: number | null;
  // teamId della nostra squadra che ha giocato la partita (per attribuire i punti
  // alla squadra giusta in gironi che includono più nostre squadre).
  teamId: string;
  // Le partite della classifica sono SEMPRE contro un avversario esterno
  // (le amichevoli interne non finiscono in girone). Lo schema lo rende nullable
  // a livello DB, ma in pratica per i record con groupId non null è sempre presente.
  opponent: { id: string; name: string } | null;
};

type GroupMatchInput = {
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
};

export function computeStandings(
  ourTeams: ReadonlyArray<{ id: string; name: string }>,
  ourMatches: OurMatchInput[],
  groupMatches: GroupMatchInput[]
): StandingEntry[] {
  const ourTeamById = new Map(ourTeams.map((t) => [t.id, t] as const));
  const map = new Map<string, StandingEntry>();

  function getOrCreate(id: string, name: string, isOurs: boolean): StandingEntry {
    if (!map.has(id)) {
      map.set(id, {
        id,
        name,
        isOurs,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      });
    }
    return map.get(id)!;
  }

  function addResult(entry: StandingEntry, gf: number, ga: number) {
    entry.played++;
    entry.goalsFor += gf;
    entry.goalsAgainst += ga;
    if (gf > ga) {
      entry.won++;
      entry.points += POINTS.win;
    } else if (gf === ga) {
      entry.drawn++;
      entry.points += POINTS.draw;
    } else {
      entry.lost++;
      entry.points += POINTS.loss;
    }
  }

  const results: Result[] = [];
  function record(aId: string, bId: string, a: number, b: number) {
    results.push({ aId, bId, a, b });
  }

  // ourScore/theirScore sono già relativi a noi — nessun swap necessario.
  // Skippa le partite senza avversario esterno (amichevoli interne, non in girone).
  for (const m of ourMatches) {
    if (m.ourScore == null || m.theirScore == null) continue;
    if (!m.opponent) continue;
    const ourTeam = ourTeamById.get(m.teamId);
    if (!ourTeam) continue;
    addResult(getOrCreate(ourTeam.id, ourTeam.name, true), m.ourScore, m.theirScore);
    addResult(getOrCreate(m.opponent.id, m.opponent.name, false), m.theirScore, m.ourScore);
    record(ourTeam.id, m.opponent.id, m.ourScore, m.theirScore);
  }

  for (const gm of groupMatches) {
    if (gm.homeScore == null || gm.awayScore == null) continue;
    addResult(getOrCreate(gm.homeTeam.id, gm.homeTeam.name, false), gm.homeScore, gm.awayScore);
    addResult(getOrCreate(gm.awayTeam.id, gm.awayTeam.name, false), gm.awayScore, gm.homeScore);
    record(gm.homeTeam.id, gm.awayTeam.id, gm.homeScore, gm.awayScore);
  }

  return sortStandings(Array.from(map.values()), results);
}

export const POINTS = { win: 3, draw: 2, loss: 1 } as const;

type Result = { aId: string; bId: string; a: number; b: number };

/** Punti fatti diviso subiti; senza subiti vince chi ha segnato. */
function quotient(gf: number, ga: number): number {
  if (ga === 0) return gf > 0 ? Infinity : 0;
  return gf / ga;
}

/**
 * Ordine della classifica: punti, poi, fra le squadre a pari punti, la
 * classifica avulsa dei loro scontri diretti (punti, poi quoziente canestri),
 * poi il quoziente canestri di tutto il campionato, poi il nome.
 */
function sortStandings(entries: StandingEntry[], results: Result[]): StandingEntry[] {
  const byPoints = new Map<number, StandingEntry[]>();
  for (const e of entries) byPoints.set(e.points, [...(byPoints.get(e.points) ?? []), e]);

  const ordered: StandingEntry[] = [];
  for (const points of [...byPoints.keys()].sort((a, b) => b - a)) {
    const tied = byPoints.get(points)!;
    if (tied.length === 1) {
      ordered.push(tied[0]);
      continue;
    }
    const ids = new Set(tied.map((t) => t.id));
    const h2h = new Map<string, { points: number; gf: number; ga: number }>(
      tied.map((t) => [t.id, { points: 0, gf: 0, ga: 0 }])
    );
    for (const r of results) {
      if (!ids.has(r.aId) || !ids.has(r.bId)) continue;
      const a = h2h.get(r.aId)!;
      const b = h2h.get(r.bId)!;
      a.gf += r.a;
      a.ga += r.b;
      b.gf += r.b;
      b.ga += r.a;
      const [pa, pb] =
        r.a > r.b
          ? [POINTS.win, POINTS.loss]
          : r.a < r.b
            ? [POINTS.loss, POINTS.win]
            : [POINTS.draw, POINTS.draw];
      a.points += pa;
      b.points += pb;
    }
    tied.sort((x, y) => {
      const hx = h2h.get(x.id)!;
      const hy = h2h.get(y.id)!;
      return (
        hy.points - hx.points ||
        quotient(hy.gf, hy.ga) - quotient(hx.gf, hx.ga) ||
        quotient(y.goalsFor, y.goalsAgainst) - quotient(x.goalsFor, x.goalsAgainst) ||
        x.name.localeCompare(y.name, "it")
      );
    });
    ordered.push(...tied);
  }
  return ordered;
}
