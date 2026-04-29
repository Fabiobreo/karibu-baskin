export interface Athlete {
  id: string;
  name: string;
  role: number;
}

export interface Teams {
  teamA: Athlete[];
  teamB: Athlete[];
  teamC?: Athlete[];
  numTeams: 2 | 3;
}

// Mulberry32 PRNG — fast, deterministic, good enough for this use
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (Math.imul(31, hash) + s.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Assegna un atleta al bucket con il conteggio minore nell'array dato
function assignToSmallest(athlete: Athlete, buckets: Athlete[][], groupCounts: number[]): void {
  const minVal = Math.min(...groupCounts);
  const idx = groupCounts.indexOf(minVal);
  buckets[idx].push(athlete);
  groupCounts[idx]++;
}

export function generateTeams(
  athletes: Athlete[],
  sessionId: string,
  numTeams: 2 | 3 = 2,
): Teams {
  const buckets: Athlete[][] = Array.from({ length: numTeams }, () => []);
  const lowCounts = new Array<number>(numTeams).fill(0);
  const highCounts = new Array<number>(numTeams).fill(0);

  const lowLeftovers: Athlete[] = [];
  const highLeftovers: Athlete[] = [];

  // Passo 1: per ogni ruolo, distribuisci floor(count/numTeams) atleti a ciascuna
  // squadra in modo uniforme; i rimanenti vanno nel pool avanzi del gruppo (low/high)
  for (let role = 1; role <= 5; role++) {
    const isLow = role <= 2;
    const group = seededShuffle(
      athletes.filter((a) => a.role === role),
      stringToSeed(`${sessionId}-r${role}`),
    );
    const base = Math.floor(group.length / numTeams);

    for (let t = 0; t < numTeams; t++) {
      const slice = group.slice(t * base, (t + 1) * base);
      buckets[t].push(...slice);
      if (isLow) lowCounts[t] += slice.length;
      else highCounts[t] += slice.length;
    }

    const leftovers = group.slice(numTeams * base);
    if (isLow) lowLeftovers.push(...leftovers);
    else highLeftovers.push(...leftovers);
  }

  // Passo 2: distribuisci gli avanzi low bilanciando il totale R1+R2 per squadra
  const shuffledLowLeftovers = seededShuffle(
    lowLeftovers,
    stringToSeed(`${sessionId}-low-leftovers`),
  );
  for (const a of shuffledLowLeftovers) {
    assignToSmallest(a, buckets, lowCounts);
  }

  // Passo 3: distribuisci gli avanzi high bilanciando il totale R3+R4+R5 per squadra
  const shuffledHighLeftovers = seededShuffle(
    highLeftovers,
    stringToSeed(`${sessionId}-high-leftovers`),
  );
  for (const a of shuffledHighLeftovers) {
    assignToSmallest(a, buckets, highCounts);
  }

  // Passo 4: correzione finale — se la differenza di dimensioni è > 1 sposta un atleta
  const sizes = buckets.map((b) => b.length);
  const maxLen = Math.max(...sizes);
  const minLen = Math.min(...sizes);
  if (maxLen - minLen > 1) {
    const from = sizes.indexOf(maxLen);
    const to = sizes.indexOf(minLen);
    buckets[to].push(buckets[from].pop()!);
  }

  return {
    teamA: buckets[0],
    teamB: buckets[1],
    ...(numTeams === 3 ? { teamC: buckets[2] } : {}),
    numTeams,
  };
}
