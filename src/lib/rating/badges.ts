export type BadgeTier = "bronze" | "silver" | "gold";

export type Badge = {
  id: string;
  label: string;
  description: string;
  emoji: string;
  tier: BadgeTier;
};

/** Badge non ancora sbloccato, con avanzamento verso la soglia. */
export type LockedBadge = Badge & { current: number; target: number };

type MatchStat = {
  points: number;
  twoPointers: number;
  threePointers: number;
  freeThrows: number;
};

type StatsInput = {
  matchStats: MatchStat[];
  mvpCount: number;
  topScorerCount: number; // stagioni come 1° marcatore
};

const maxOf = (stats: MatchStat[], pick: (m: MatchStat) => number): number =>
  stats.reduce((max, m) => Math.max(max, pick(m)), 0);

// Definizioni badge in ordine di "rarità" crescente.
// `progress` (opzionale) descrive l'avanzamento verso lo sblocco, usato per
// mostrare "prossimi traguardi" con barra di completamento.
const BADGE_DEFS: Array<{
  id: string;
  label: string;
  description: string;
  emoji: string;
  tier: BadgeTier;
  check: (s: StatsInput) => boolean;
  progress?: (s: StatsInput) => { current: number; target: number };
}> = [
  {
    id: "esordiente",
    label: "Esordiente",
    description: "Prima partita ufficiale disputata",
    emoji: "🏀",
    tier: "bronze",
    check: ({ matchStats }) => matchStats.length >= 1,
    progress: ({ matchStats }) => ({ current: Math.min(matchStats.length, 1), target: 1 }),
  },
  {
    id: "primo_canestro",
    label: "Primo canestro",
    description: "Primo punto segnato in una partita ufficiale",
    emoji: "🎯",
    tier: "bronze",
    check: ({ matchStats }) => matchStats.some((m) => m.points > 0),
    progress: ({ matchStats }) => ({
      current: Math.min(
        maxOf(matchStats, (m) => m.points),
        1
      ),
      target: 1,
    }),
  },
  {
    id: "dieci_partite",
    label: "10 partite",
    description: "10 partite ufficiali disputate",
    emoji: "🔟",
    tier: "bronze",
    check: ({ matchStats }) => matchStats.length >= 10,
    progress: ({ matchStats }) => ({ current: Math.min(matchStats.length, 10), target: 10 }),
  },
  {
    id: "cecchino",
    label: "Cecchino",
    description: "3 o più canestri da 3 punti in una singola partita",
    emoji: "🏹",
    tier: "bronze",
    check: ({ matchStats }) => matchStats.some((m) => m.threePointers >= 3),
    progress: ({ matchStats }) => ({
      current: Math.min(
        maxOf(matchStats, (m) => m.threePointers),
        3
      ),
      target: 3,
    }),
  },
  {
    id: "venticinque_partite",
    label: "25 partite",
    description: "25 partite ufficiali disputate",
    emoji: "⭐",
    tier: "silver",
    check: ({ matchStats }) => matchStats.length >= 25,
    progress: ({ matchStats }) => ({ current: Math.min(matchStats.length, 25), target: 25 }),
  },
  {
    id: "tripla",
    label: "Tripla mista",
    description: "In una partita: almeno 1 canestro da 2pt, 1 da 3pt e 1 tiro libero",
    emoji: "🎭",
    tier: "silver",
    check: ({ matchStats }) =>
      matchStats.some((m) => m.twoPointers >= 1 && m.threePointers >= 1 && m.freeThrows >= 1),
  },
  {
    id: "bomber",
    label: "Bomber",
    description: "20 o più punti in una singola partita",
    emoji: "💣",
    tier: "silver",
    check: ({ matchStats }) => matchStats.some((m) => m.points >= 20),
    progress: ({ matchStats }) => ({
      current: Math.min(
        maxOf(matchStats, (m) => m.points),
        20
      ),
      target: 20,
    }),
  },
  {
    id: "mvp",
    label: "MVP",
    description: "Eletto MVP della partita almeno una volta",
    emoji: "🌟",
    tier: "silver",
    check: ({ mvpCount }) => mvpCount >= 1,
    progress: ({ mvpCount }) => ({ current: Math.min(mvpCount, 1), target: 1 }),
  },
  {
    id: "cinquanta_partite",
    label: "Veterano",
    description: "50 partite ufficiali disputate",
    emoji: "🏆",
    tier: "gold",
    check: ({ matchStats }) => matchStats.length >= 50,
    progress: ({ matchStats }) => ({ current: Math.min(matchStats.length, 50), target: 50 }),
  },
  {
    id: "top_scorer",
    label: "Top scorer",
    description: "1° marcatore della squadra in una stagione",
    emoji: "👑",
    tier: "gold",
    check: ({ topScorerCount }) => topScorerCount >= 1,
    progress: ({ topScorerCount }) => ({ current: Math.min(topScorerCount, 1), target: 1 }),
  },
];

/** Metadati di tutti i badge (senza la logica di check), per lookup in UI/notifiche. */
export const ALL_BADGES: Badge[] = BADGE_DEFS.map(({ check: _c, progress: _p, ...badge }) => badge);

export function getBadgeById(id: string): Badge | undefined {
  return ALL_BADGES.find((b) => b.id === id);
}

/** Badge attualmente sbloccati dal giocatore. */
export function computeBadges(input: StatsInput): Badge[] {
  return BADGE_DEFS.filter((def) => def.check(input)).map(
    ({ check: _check, progress: _p, ...badge }) => badge
  );
}

/**
 * Stato completo: badge sbloccati + badge ancora bloccati (con avanzamento).
 * I bloccati includono solo quelli con una funzione `progress` definita, così
 * la UI può sempre mostrare una barra "x/y".
 */
export function computeBadgeState(input: StatsInput): { earned: Badge[]; locked: LockedBadge[] } {
  const earned: Badge[] = [];
  const locked: LockedBadge[] = [];
  for (const def of BADGE_DEFS) {
    const { check, progress, ...badge } = def;
    if (check(input)) {
      earned.push(badge);
    } else if (progress) {
      const { current, target } = progress(input);
      locked.push({ ...badge, current, target });
    }
  }
  return { earned, locked };
}
