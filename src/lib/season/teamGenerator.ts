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

/**
 * Assegna un atleta al bucket con il conteggio minore nell'array dato.
 * A parità di conteggio vince la squadra che ha meno atleti di quel ruolo:
 * senza questo spareggio due avanzi dello stesso ruolo possono finire insieme
 * lasciando l'altra squadra scoperta su quel ruolo.
 */
function assignToSmallest(
  athlete: Athlete,
  buckets: Athlete[][],
  groupCounts: number[],
  roleCounts: number[][]
): number {
  let idx = 0;
  for (let t = 1; t < buckets.length; t++) {
    const better =
      groupCounts[t] < groupCounts[idx] ||
      (groupCounts[t] === groupCounts[idx] &&
        roleCounts[t][athlete.role] < roleCounts[idx][athlete.role]);
    if (better) idx = t;
  }
  buckets[idx].push(athlete);
  groupCounts[idx]++;
  roleCounts[idx][athlete.role]++;
  return idx;
}

export function generateTeams(athletes: Athlete[], sessionId: string, numTeams: 2 | 3 = 2): Teams {
  const buckets: Athlete[][] = Array.from({ length: numTeams }, () => []);
  const lowCounts = new Array<number>(numTeams).fill(0);
  const highCounts = new Array<number>(numTeams).fill(0);
  const womenR45Counts = new Array<number>(numTeams).fill(0);
  // roleCounts[squadra][ruolo] — usato per lo spareggio nella distribuzione avanzi
  const roleCounts: number[][] = Array.from({ length: numTeams }, () =>
    new Array<number>(6).fill(0)
  );

  const lowLeftovers: Athlete[] = [];
  const highLeftovers: Athlete[] = [];
  // Donne R4+R5 estratte dal flusso normale per bilanciamento di genere,
  // tenute separate per ruolo: mescolarle in un unico pool sbilancia i ruoli
  // (una R5 può prendere il posto di una R4 nel giro di assegnazione).
  const womenByRole = new Map<number, Athlete[]>();

  // Passo 1: per ogni ruolo, distribuisci floor(count/numTeams) atleti a ciascuna
  // squadra in modo uniforme; i rimanenti vanno nel pool avanzi del gruppo (low/high).
  // Eccezione: le donne nei ruoli 4 e 5 vengono estratte in womenByRole
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
      womenByRole.set(role, women);

      const base = Math.floor(men.length / numTeams);
      for (let t = 0; t < numTeams; t++) {
        const slice = men.slice(t * base, (t + 1) * base);
        buckets[t].push(...slice);
        highCounts[t] += slice.length;
        roleCounts[t][role] += slice.length;
      }
      highLeftovers.push(...men.slice(numTeams * base));
    } else {
      const base = Math.floor(group.length / numTeams);
      for (let t = 0; t < numTeams; t++) {
        const slice = group.slice(t * base, (t + 1) * base);
        buckets[t].push(...slice);
        if (isLow) lowCounts[t] += slice.length;
        else highCounts[t] += slice.length;
        roleCounts[t][role] += slice.length;
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
    assignToSmallest(a, buckets, lowCounts, roleCounts);
  }

  // Passo 3: distribuisci gli avanzi high (uomini R3-5) bilanciando il totale per squadra
  const shuffledHighLeftovers = seededShuffle(
    highLeftovers,
    stringToSeed(`${sessionId}-high-leftovers`)
  );
  for (const a of shuffledHighLeftovers) {
    assignToSmallest(a, buckets, highCounts, roleCounts);
  }

  // Passo 3.5: distribuisci le donne R4+R5. Prima la quota piena ruolo per ruolo
  // (come per gli uomini), così i ruoli restano pari; solo gli avanzi si
  // bilanciano sul conteggio femminile, con spareggio sul ruolo.
  const womenLeftovers: Athlete[] = [];
  for (const role of [4, 5]) {
    const women = seededShuffle(
      womenByRole.get(role) ?? [],
      stringToSeed(`${sessionId}-women-r${role}`)
    );
    const base = Math.floor(women.length / numTeams);
    for (let t = 0; t < numTeams; t++) {
      const slice = women.slice(t * base, (t + 1) * base);
      buckets[t].push(...slice);
      womenR45Counts[t] += slice.length;
      highCounts[t] += slice.length;
      roleCounts[t][role] += slice.length;
    }
    womenLeftovers.push(...women.slice(numTeams * base));
  }
  const shuffledWomenLeftovers = seededShuffle(
    womenLeftovers,
    stringToSeed(`${sessionId}-women-leftovers`)
  );
  for (const a of shuffledWomenLeftovers) {
    const idx = assignToSmallest(a, buckets, womenR45Counts, roleCounts);
    highCounts[idx]++;
  }

  // Passo 4: correzione dimensioni — finché la differenza è > 1 sposta un atleta.
  // Sposta uno del ruolo più sovrarappresentato nella squadra piena, non
  // l'ultimo arrivato: spostare a caso rimette in squilibrio i ruoli.
  // Con 3 squadre un solo spostamento non sempre basta (es. 5-2-2).
  for (let guard = 0; guard < athletes.length; guard++) {
    const sizes = buckets.map((b) => b.length);
    const maxLen = Math.max(...sizes);
    const minLen = Math.min(...sizes);
    if (maxLen - minLen <= 1) break;
    const from = sizes.indexOf(maxLen);
    const to = sizes.indexOf(minLen);
    let pick = buckets[from].length - 1;
    let bestGap = -Infinity;
    for (let i = 0; i < buckets[from].length; i++) {
      const role = buckets[from][i].role;
      const gap = roleCounts[from][role] - roleCounts[to][role];
      if (gap > bestGap) {
        bestGap = gap;
        pick = i;
      }
    }
    const moved = buckets[from].splice(pick, 1)[0];
    buckets[to].push(moved);
    roleCounts[from][moved.role]--;
    roleCounts[to][moved.role]++;
  }

  // Passo 4.5: riparazione ruoli. I giri precedenti bilanciano uomini e donne
  // dello stesso ruolo separatamente, quindi entrambi possono arrotondare per
  // eccesso sulla stessa squadra (es. 4 donne R4 + 1 donna R5 → 3-1 su R4).
  // Qui si scambiano coppie di atleti di ruolo diverso, a dimensioni invariate,
  // finché lo squilibrio per ruolo smette di calare.
  repairRoleSpread(buckets, stringToSeed(`${sessionId}-roles`));

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

/** Costo di squilibrio: somma degli scarti max-min per ogni ruolo, più lo
 *  scarto delle donne R4-R5 come criterio secondario (peso minore, non deve
 *  mai far preferire uno scambio che peggiora i ruoli). */
function spreadCost(buckets: Athlete[][]): number {
  let cost = 0;
  for (let role = 1; role <= 5; role++) {
    const counts = buckets.map((b) => b.filter((a) => a.role === role).length);
    cost += Math.max(...counts) - Math.min(...counts);
  }
  const women = buckets.map((b) => b.filter((a) => a.gender === "FEMALE" && a.role >= 4).length);
  cost += (Math.max(...women) - Math.min(...women)) * 0.5;
  return cost;
}

/**
 * Scambia coppie di atleti tra squadre finché lo squilibrio per ruolo cala.
 * Le dimensioni delle squadre non cambiano (è sempre uno scambio, mai uno
 * spostamento) e a parità di guadagno si preferisce lo scambio tra atleti
 * dello stesso genere, per non disfare il bilanciamento femminile.
 */
function repairRoleSpread(buckets: Athlete[][], seed: number): void {
  const MAX_ITERATIONS = 50;
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const current = spreadCost(buckets);
    if (current === 0) return;
    let best: { ti: number; ai: number; tj: number; aj: number; cost: number; key: string } | null =
      null;

    for (let ti = 0; ti < buckets.length; ti++) {
      for (let tj = ti + 1; tj < buckets.length; tj++) {
        for (let ai = 0; ai < buckets[ti].length; ai++) {
          for (let aj = 0; aj < buckets[tj].length; aj++) {
            const x = buckets[ti][ai];
            const y = buckets[tj][aj];
            if (x.role === y.role) continue; // scambio inutile per i ruoli

            buckets[ti][ai] = y;
            buckets[tj][aj] = x;
            const cost = spreadCost(buckets);
            buckets[ti][ai] = x;
            buckets[tj][aj] = y;

            if (cost >= current - 1e-9) continue;
            // Tie-break deterministico: prima gli scambi tra stesso genere,
            // poi ordine stabile sugli id.
            const sameGender = (x.gender ?? null) === (y.gender ?? null) ? "0" : "1";
            const key = `${sameGender}:${pairKey(x, y, seed)}`;
            if (
              best === null ||
              cost < best.cost - 1e-9 ||
              (cost < best.cost + 1e-9 && key < best.key)
            ) {
              best = { ti, ai, tj, aj, cost, key };
            }
          }
        }
      }
    }

    if (!best) return; // nessun miglioramento possibile
    const tmp = buckets[best.ti][best.ai];
    buckets[best.ti][best.ai] = buckets[best.tj][best.aj];
    buckets[best.tj][best.aj] = tmp;
  }
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

/**
 * Squadre senza il rating dei singoli atleti.
 *
 * `generateTeams` riceve il TrueSkill per bilanciare le squadre e lo lascia
 * negli oggetti atleta. Quelle squadre vengono salvate sull'allenamento e
 * servite a ogni tesserato dalla GET, mentre il rating è visibile solo allo
 * staff (KB-40). Va quindi tolto sia al salvataggio sia in lettura, per le
 * squadre già salvate prima di questa correzione.
 */
export function withoutRatings<T extends object>(teams: T): T {
  const out: Record<string, unknown> = { ...(teams as Record<string, unknown>) };
  for (const key of ["teamA", "teamB", "teamC"]) {
    const list = out[key];
    if (!Array.isArray(list)) continue;
    out[key] = list.map((athlete: unknown) => {
      if (!athlete || typeof athlete !== "object") return athlete;
      const copy = { ...(athlete as Record<string, unknown>) };
      delete copy.rating;
      return copy;
    });
  }
  return out as T;
}
