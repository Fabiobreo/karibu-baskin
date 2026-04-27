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

// Distribuisce round-robin partendo dal bucket più scarso (minimize imbalance)
function distributeRoundRobin(athletes: Athlete[], buckets: Athlete[][]): void {
  const k = buckets.length;
  const start = buckets.reduce(
    (minI, b, i) => (b.length < buckets[minI].length ? i : minI),
    0,
  );
  athletes.forEach((a, i) => buckets[(i + start) % k].push(a));
}

export function generateTeams(
  athletes: Athlete[],
  sessionId: string,
  numTeams: 2 | 3 = 2,
): Teams {
  const buckets: Athlete[][] = Array.from({ length: numTeams }, () => []);

  // Dividi in gruppo basso (R1+R2) e alto (R3+R4+R5)
  const low = athletes.filter((a) => a.role <= 2);
  const high = athletes.filter((a) => a.role >= 3);

  // Mescola ciascun gruppo in modo deterministico
  const shuffledLow = seededShuffle(low, stringToSeed(`${sessionId}-low`));
  const shuffledHigh = seededShuffle(high, stringToSeed(`${sessionId}-high`));

  // Distribuisci round-robin bilanciato: prima il gruppo basso, poi l'alto
  // (il secondo parte dal bucket con meno giocatori per ridurre lo sbilanciamento)
  distributeRoundRobin(shuffledLow, buckets);
  distributeRoundRobin(shuffledHigh, buckets);

  // Check finale sul totale: se la differenza è > 1 sposta un giocatore
  // (può accadere quando entrambi i gruppi hanno resto nella divisione)
  const maxLen = () => Math.max(...buckets.map((b) => b.length));
  const minLen = () => Math.min(...buckets.map((b) => b.length));

  if (maxLen() - minLen() > 1) {
    const from = buckets.reduce((a, _, i) => (buckets[i].length > buckets[a].length ? i : a), 0);
    const to = buckets.reduce((a, _, i) => (buckets[i].length < buckets[a].length ? i : a), 0);
    buckets[to].push(buckets[from].pop()!);
  }

  return {
    teamA: buckets[0],
    teamB: buckets[1],
    ...(numTeams === 3 ? { teamC: buckets[2] } : {}),
    numTeams,
  };
}
