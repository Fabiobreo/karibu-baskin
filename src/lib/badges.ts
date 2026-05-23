export type BadgeTier = "bronze" | "silver" | "gold";

export type Badge = {
  id: string;
  label: string;
  description: string;
  emoji: string;
  tier: BadgeTier;
};

type StatsInput = {
  matchStats: Array<{
    points: number;
    twoPointers: number;
    threePointers: number;
    freeThrows: number;
  }>;
  mvpCount: number;
  topScorerCount: number; // stagioni come 1° marcatore
};

// Definizioni badge in ordine di "rarità" crescente
const BADGE_DEFS: Array<{
  id: string;
  label: string;
  description: string;
  emoji: string;
  tier: BadgeTier;
  check: (s: StatsInput) => boolean;
}> = [
  {
    id: "esordiente",
    label: "Esordiente",
    description: "Prima partita ufficiale disputata",
    emoji: "🏀",
    tier: "bronze",
    check: ({ matchStats }) => matchStats.length >= 1,
  },
  {
    id: "primo_canestro",
    label: "Primo canestro",
    description: "Primo punto segnato in una partita ufficiale",
    emoji: "🎯",
    tier: "bronze",
    check: ({ matchStats }) => matchStats.some((m) => m.points > 0),
  },
  {
    id: "dieci_partite",
    label: "10 partite",
    description: "10 partite ufficiali disputate",
    emoji: "🔟",
    tier: "bronze",
    check: ({ matchStats }) => matchStats.length >= 10,
  },
  {
    id: "cecchino",
    label: "Cecchino",
    description: "3 o più canestri da 3 punti in una singola partita",
    emoji: "🏹",
    tier: "bronze",
    check: ({ matchStats }) => matchStats.some((m) => m.threePointers >= 3),
  },
  {
    id: "venticinque_partite",
    label: "25 partite",
    description: "25 partite ufficiali disputate",
    emoji: "⭐",
    tier: "silver",
    check: ({ matchStats }) => matchStats.length >= 25,
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
  },
  {
    id: "mvp",
    label: "MVP",
    description: "Eletto MVP della partita almeno una volta",
    emoji: "🌟",
    tier: "silver",
    check: ({ mvpCount }) => mvpCount >= 1,
  },
  {
    id: "cinquanta_partite",
    label: "Veterano",
    description: "50 partite ufficiali disputate",
    emoji: "🏆",
    tier: "gold",
    check: ({ matchStats }) => matchStats.length >= 50,
  },
  {
    id: "top_scorer",
    label: "Top scorer",
    description: "1° marcatore della squadra in una stagione",
    emoji: "👑",
    tier: "gold",
    check: ({ topScorerCount }) => topScorerCount >= 1,
  },
];

export function computeBadges(input: StatsInput): Badge[] {
  return BADGE_DEFS.filter((def) => def.check(input)).map(({ check: _check, ...badge }) => badge);
}
