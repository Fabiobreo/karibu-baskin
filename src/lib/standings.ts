// [CLAUDE - 09:00] Logica classifica girone estratta per evitare duplicazione tra
// src/app/gironi/[groupId]/page.tsx e src/app/api/groups/[groupId]/route.ts.
// Usa il sistema punti Baskin: V=2, P=1, S=0 (NON il 3-1-0 del calcio).

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
  opponent: { id: string; name: string };
};

type GroupMatchInput = {
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
};

export function computeStandings(
  ourTeam: { id: string; name: string },
  ourMatches: OurMatchInput[],
  groupMatches: GroupMatchInput[],
): StandingEntry[] {
  const map = new Map<string, StandingEntry>();

  function getOrCreate(id: string, name: string, isOurs: boolean): StandingEntry {
    if (!map.has(id)) {
      map.set(id, { id, name, isOurs, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    }
    return map.get(id)!;
  }

  function addResult(entry: StandingEntry, gf: number, ga: number) {
    entry.played++;
    entry.goalsFor     += gf;
    entry.goalsAgainst += ga;
    if (gf > ga)      { entry.won++;   entry.points += 2; }
    else if (gf === ga) { entry.drawn++; entry.points += 1; }
    else                { entry.lost++; }
  }

  // ourScore/theirScore sono già relativi a noi — nessun swap necessario
  for (const m of ourMatches) {
    if (m.ourScore == null || m.theirScore == null) continue;
    addResult(getOrCreate(ourTeam.id,       ourTeam.name,       true),  m.ourScore,   m.theirScore);
    addResult(getOrCreate(m.opponent.id,    m.opponent.name,    false), m.theirScore, m.ourScore);
  }

  for (const gm of groupMatches) {
    if (gm.homeScore == null || gm.awayScore == null) continue;
    addResult(getOrCreate(gm.homeTeam.id,   gm.homeTeam.name,   false), gm.homeScore, gm.awayScore);
    addResult(getOrCreate(gm.awayTeam.id,   gm.awayTeam.name,   false), gm.awayScore, gm.homeScore);
  }

  return Array.from(map.values()).sort((a, b) =>
    b.points - a.points ||
    (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
    b.goalsFor - a.goalsFor
  );
}
