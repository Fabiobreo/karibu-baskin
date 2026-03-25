import { ROLES } from "./constants";

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

export function generateTeams(
  athletes: Athlete[],
  sessionId: string,
  numTeams: 2 | 3 = 2
): Teams {
  const buckets: Athlete[][] = Array.from({ length: numTeams }, () => []);

  // Per ogni ruolo, mescola in modo deterministico e distribuisce round-robin
  ROLES.forEach((role) => {
    const group = athletes.filter((a) => a.role === role);
    const seed = stringToSeed(`${sessionId}-${role}`);
    const shuffled = seededShuffle(group, seed);
    shuffled.forEach((athlete, i) => {
      buckets[i % numTeams].push(athlete);
    });
  });

  return {
    teamA: buckets[0],
    teamB: buckets[1],
    ...(numTeams === 3 ? { teamC: buckets[2] } : {}),
    numTeams,
  };
}
