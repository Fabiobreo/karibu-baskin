import { ROLES } from "./constants";

export interface Athlete {
  id: string;
  name: string;
  role: number;
}

export interface Teams {
  teamA: Athlete[];
  teamB: Athlete[];
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

export function generateTeams(athletes: Athlete[], sessionId: string): Teams {
  const teamA: Athlete[] = [];
  const teamB: Athlete[] = [];

  // For each role, split evenly. Odd player alternates team per role
  // alternation is seeded by sessionId to be deterministic
  const sessionSeed = stringToSeed(sessionId);

  ROLES.forEach((role, roleIndex) => {
    const group = athletes.filter((a) => a.role === role);
    const seed = stringToSeed(`${sessionId}-${role}`);
    const shuffled = seededShuffle(group, seed);

    const half = Math.floor(shuffled.length / 2);
    const isOdd = shuffled.length % 2 === 1;

    // Alternate which team gets the extra player based on role index + session seed
    const extraGoesToA = (sessionSeed + roleIndex) % 2 === 0;

    teamA.push(...shuffled.slice(0, half));
    teamB.push(...shuffled.slice(half, half * 2));

    if (isOdd) {
      const extra = shuffled[shuffled.length - 1];
      if (extraGoesToA) {
        teamA.push(extra);
      } else {
        teamB.push(extra);
      }
    }
  });

  return { teamA, teamB };
}
