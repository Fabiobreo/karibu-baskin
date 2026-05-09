export interface Athlete {
  id: string;
  name: string;
  role: number;
  gender?: string | null;
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
  const womenR45Counts = new Array<number>(numTeams).fill(0);

  const lowLeftovers: Athlete[] = [];
  const highLeftovers: Athlete[] = [];
  // Donne R4+R5 estratte dal flusso normale per bilanciamento di genere
  const womenR45: Athlete[] = [];

  // Passo 1: per ogni ruolo, distribuisci floor(count/numTeams) atleti a ciascuna
  // squadra in modo uniforme; i rimanenti vanno nel pool avanzi del gruppo (low/high).
  // Eccezione: le donne nei ruoli 4 e 5 vengono estratte nel pool womenR45
  // per una distribuzione separata bilanciata per genere (passo 3.5).
  for (let role = 1; role <= 5; role++) {
    const isLow = role <= 2;
    const needsGenderBalance = role >= 4;

    const group = seededShuffle(
      athletes.filter((a) => a.role === role),
      stringToSeed(`${sessionId}-r${role}`),
    );

    if (needsGenderBalance) {
      const women = group.filter((a) => a.gender === "FEMALE");
      const men = group.filter((a) => a.gender !== "FEMALE");
      womenR45.push(...women);

      const base = Math.floor(men.length / numTeams);
      for (let t = 0; t < numTeams; t++) {
        const slice = men.slice(t * base, (t + 1) * base);
        buckets[t].push(...slice);
        highCounts[t] += slice.length;
      }
      highLeftovers.push(...men.slice(numTeams * base));
    } else {
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
  }

  // Passo 2: distribuisci gli avanzi low bilanciando il totale R1+R2 per squadra
  const shuffledLowLeftovers = seededShuffle(
    lowLeftovers,
    stringToSeed(`${sessionId}-low-leftovers`),
  );
  for (const a of shuffledLowLeftovers) {
    assignToSmallest(a, buckets, lowCounts);
  }

  // Passo 3: distribuisci gli avanzi high (uomini R3-5) bilanciando il totale per squadra
  const shuffledHighLeftovers = seededShuffle(
    highLeftovers,
    stringToSeed(`${sessionId}-high-leftovers`),
  );
  for (const a of shuffledHighLeftovers) {
    assignToSmallest(a, buckets, highCounts);
  }

  // Passo 3.5: distribuisci le donne R4+R5 bilanciando il conteggio femminile per squadra
  const shuffledWomenR45 = seededShuffle(
    womenR45,
    stringToSeed(`${sessionId}-women-r45`),
  );
  for (const a of shuffledWomenR45) {
    const minVal = Math.min(...womenR45Counts);
    const idx = womenR45Counts.indexOf(minVal);
    buckets[idx].push(a);
    womenR45Counts[idx]++;
    highCounts[idx]++;
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
