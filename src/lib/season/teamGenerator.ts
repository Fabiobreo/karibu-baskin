export interface Athlete {
  id: string;
  name: string;
  role: number;
  gender?: string | null;
  /** μ TrueSkill (skill attesa). Assente/undefined = giocatore non valutato. */
  rating?: number | null;
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

export function generateTeams(athletes: Athlete[], sessionId: string, numTeams: 2 | 3 = 2): Teams {
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
      stringToSeed(`${sessionId}-r${role}`)
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
    stringToSeed(`${sessionId}-low-leftovers`)
  );
  for (const a of shuffledLowLeftovers) {
    assignToSmallest(a, buckets, lowCounts);
  }

  // Passo 3: distribuisci gli avanzi high (uomini R3-5) bilanciando il totale per squadra
  const shuffledHighLeftovers = seededShuffle(
    highLeftovers,
    stringToSeed(`${sessionId}-high-leftovers`)
  );
  for (const a of shuffledHighLeftovers) {
    assignToSmallest(a, buckets, highCounts);
  }

  // Passo 3.5: distribuisci le donne R4+R5 bilanciando il conteggio femminile per squadra
  const shuffledWomenR45 = seededShuffle(womenR45, stringToSeed(`${sessionId}-women-r45`));
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

  // Passo 5: layer skill (TrueSkill). Bilancia il totale di μ tra le squadre
  // SENZA toccare struttura ruoli e genere — scambia solo coppie con stesso
  // ruolo e stesso genere su squadre diverse. No-op se nessuno è valutato.
  balanceSkill(buckets, stringToSeed(`${sessionId}-skill`));

  return {
    teamA: buckets[0],
    teamB: buckets[1],
    ...(numTeams === 3 ? { teamC: buckets[2] } : {}),
    numTeams,
  };
}

const DEFAULT_RATING = 25; // μ₀ TrueSkill — usato per gli atleti non valutati

function ratingOf(a: Athlete): number {
  return a.rating ?? DEFAULT_RATING;
}

/**
 * Riduce lo sbilanciamento di skill (Σμ) tra le squadre con scambi greedy
 * deterministici. Vincoli preservati: ogni scambio coinvolge due atleti con
 * lo **stesso ruolo** e lo **stesso genere** su squadre diverse → la
 * distribuzione strutturale e di genere non cambia. Se nessun atleta è
 * valutato, è un no-op (tutti hanno lo stesso rating di default).
 */
function balanceSkill(buckets: Athlete[][], seed: number): void {
  const hasRatings = buckets.some((b) => b.some((a) => a.rating != null));
  if (!hasRatings) return;

  const teamSkill = (i: number): number => buckets[i].reduce((s, a) => s + ratingOf(a), 0);
  const spread = (): number => {
    const totals = buckets.map((_, i) => teamSkill(i));
    return Math.max(...totals) - Math.min(...totals);
  };

  const MAX_ITERATIONS = 100;
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const current = spread();
    let best: { ti: number; ai: number; tj: number; aj: number; result: number } | null = null;

    // Cerca lo scambio (stesso ruolo + genere) che riduce di più lo spread.
    for (let ti = 0; ti < buckets.length; ti++) {
      for (let tj = ti + 1; tj < buckets.length; tj++) {
        for (let ai = 0; ai < buckets[ti].length; ai++) {
          for (let aj = 0; aj < buckets[tj].length; aj++) {
            const x = buckets[ti][ai];
            const y = buckets[tj][aj];
            if (x.role !== y.role || (x.gender ?? null) !== (y.gender ?? null)) continue;
            const delta = ratingOf(x) - ratingOf(y);
            if (delta === 0) continue;

            const totals = buckets.map((_, i) => teamSkill(i));
            totals[ti] -= delta;
            totals[tj] += delta;
            const result = Math.max(...totals) - Math.min(...totals);

            // Tie-break deterministico: a parità, scegli gli id minori.
            if (
              result < current - 1e-9 &&
              (best === null ||
                result < best.result - 1e-9 ||
                (Math.abs(result - best.result) < 1e-9 &&
                  pairKey(x, y, seed) <
                    pairKey(buckets[best.ti][best.ai], buckets[best.tj][best.aj], seed)))
            ) {
              best = { ti, ai, tj, aj, result };
            }
          }
        }
      }
    }

    if (!best) break; // nessun miglioramento possibile
    const tmp = buckets[best.ti][best.ai];
    buckets[best.ti][best.ai] = buckets[best.tj][best.aj];
    buckets[best.tj][best.aj] = tmp;
  }
}

/** Chiave di ordinamento deterministica per un tie-break tra scambi equivalenti. */
function pairKey(x: Athlete, y: Athlete, seed: number): string {
  const ids = [x.id, y.id].sort();
  return `${seed}:${ids[0]}:${ids[1]}`;
}
