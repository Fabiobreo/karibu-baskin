import { getCurrentSeason } from "@/lib/season/seasonUtils";

export type BadgeTier = "bronze" | "silver" | "gold";

/**
 * Token del tema per il metallo di un livello (UX-29): bordo, fondo e testo.
 * I metalli dicono il livello e vanno sempre con una forma o un'etichetta.
 */
export function medalTier(tier: BadgeTier) {
  return {
    border: `medal.${tier}`,
    bg: `medal.${tier}Bg`,
    text: `medal.${tier}`,
  } as const;
}

export type BadgeCategory =
  | "allenamenti"
  | "punti"
  | "precisione"
  | "continuita"
  | "vittorie"
  | "presenza"
  | "premi"
  | "speciali";

export type Badge = {
  id: string;
  label: string;
  description: string;
  emoji: string;
  tier: BadgeTier;
  category: BadgeCategory;
};

/** Badge non ancora sbloccato, con avanzamento verso la soglia. */
export type LockedBadge = Badge & { current: number; target: number };

/** Una riga di statistiche di partita, normalizzata per il calcolo dei badge. */
export type MatchStat = {
  points: number;
  twoPointers: number;
  threePointers: number;
  freeThrows: number;
  shotsAttempted: number;
  fouls: number;
  illegalFouls: number;
  isLoan: boolean;
  won: boolean; // risultato della partita = WIN
  date: Date;
  season: string;
};

/**
 * Un allenamento in cui lo staff ha segnato le presenze (almeno una persona
 * segnata), visto da un giocatore (UX-59). Ci sono quelli a cui poteva
 * iscriversi e quelli a cui è venuto: un allenamento riservato a un'altra
 * squadra, a cui non è venuto, non c'è.
 */
export type TrainingRecord = {
  date: Date;
  season: string;
  /** Presenza segnata dallo staff (`Registration.attended = true`). */
  attended: boolean;
};

export type StatsInput = {
  matchStats: MatchStat[];
  /** Allenamenti con le presenze segnate (UX-59). Assente = nessuno. */
  trainings?: TrainingRecord[];
  /** Stagione in corso: "Stagione fedele" guarda solo le stagioni finite. */
  currentSeason?: string;
  mvpCount: number;
  topScorerCount: number; // stagioni come 1° marcatore
  sportRole?: number | null; // ruolo Baskin, per i badge riservati a ruoli specifici
};

// ── Helper di calcolo ────────────────────────────────────────────────────────
const made = (m: MatchStat) => m.twoPointers + m.threePointers + m.freeThrows;
const maxOf = (s: MatchStat[], pick: (m: MatchStat) => number): number =>
  s.reduce((max, m) => Math.max(max, pick(m)), 0);
const totalPoints = (s: MatchStat[]) => s.reduce((a, m) => a + m.points, 0);
const distinctSeasons = (s: MatchStat[]) => new Set(s.map((m) => m.season)).size;
const winCount = (s: MatchStat[]) => s.filter((m) => m.won).length;
const byDateAsc = (s: MatchStat[]) => [...s].sort((a, b) => a.date.getTime() - b.date.getTime());
const longestStreak = (s: MatchStat[], pred: (m: MatchStat) => boolean): number => {
  let best = 0;
  let cur = 0;
  for (const m of byDateAsc(s)) {
    if (pred(m)) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
};
// ── Allenamenti (UX-59) ──────────────────────────────────────────────────
/** Mese solare di Roma ("2026-03"): un allenamento delle 23:30 resta nel suo mese. */
const ROME_MONTH = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
});
const romeMonth = (d: Date) => ROME_MONTH.format(d).slice(0, 7);

/** Un mese conta se ha almeno tanti allenamenti con le presenze segnate. */
export const FULL_MONTH_MIN_TRAININGS = 4;
/** "Stagione fedele": quota di presenze, dal primo allenamento della stagione in cui c'era. */
export const LOYAL_SEASON_RATIO = 0.8;
/** …su almeno tanti allenamenti: chi arriva a maggio non la prende con due presenze. */
export const LOYAL_SEASON_MIN_TRAININGS = 10;

const trainingsOf = (s: StatsInput) => s.trainings ?? [];
const presences = (s: StatsInput) => trainingsOf(s).filter((t) => t.attended).length;

/** C'è un mese con almeno 4 allenamenti in cui è venuto a tutti? */
export function hasFullMonth(trainings: TrainingRecord[]): boolean {
  const months = new Map<string, { total: number; attended: number }>();
  for (const t of trainings) {
    const key = romeMonth(t.date);
    const m = months.get(key) ?? { total: 0, attended: 0 };
    m.total += 1;
    if (t.attended) m.attended += 1;
    months.set(key, m);
  }
  return [...months.values()].some(
    (m) => m.total >= FULL_MONTH_MIN_TRAININGS && m.attended === m.total
  );
}

/**
 * C'è una stagione finita in cui è venuto ad almeno l'80% degli allenamenti?
 * Si conta dal suo primo allenamento di quella stagione, così chi arriva a
 * gennaio può prenderla anche lui.
 */
export function hasLoyalSeason(trainings: TrainingRecord[], currentSeason: string): boolean {
  const bySeason = new Map<string, TrainingRecord[]>();
  for (const t of trainings) {
    if (t.season >= currentSeason) continue;
    bySeason.set(t.season, [...(bySeason.get(t.season) ?? []), t]);
  }
  for (const list of bySeason.values()) {
    const sorted = [...list].sort((a, b) => a.date.getTime() - b.date.getTime());
    const first = sorted.findIndex((t) => t.attended);
    if (first < 0) continue;
    const counted = sorted.slice(first);
    if (counted.length < LOYAL_SEASON_MIN_TRAININGS) continue;
    const attended = counted.filter((t) => t.attended).length;
    if (attended / counted.length >= LOYAL_SEASON_RATIO) return true;
  }
  return false;
}

const presenceBadge = (
  id: string,
  label: string,
  target: number,
  emoji: string,
  tier: BadgeTier
) => ({
  id,
  label,
  description: target === 1 ? "Fare il primo allenamento" : `Fare ${target} allenamenti`,
  emoji,
  tier,
  category: "allenamenti" as const,
  check: (s: StatsInput) => presences(s) >= target,
  progress: (s: StatsInput) => ({ current: Math.min(presences(s), target), target }),
});

const isR5 = (role: number | null | undefined) => role === 5;
const isR4orR5 = (role: number | null | undefined) => role === 4 || role === 5;

// Definizioni badge. `progress` (opzionale) descrive l'avanzamento verso lo
// sblocco; `appliesTo` (opzionale) limita il badge a certi ruoli Baskin: i badge
// non applicabili al ruolo del giocatore non vengono né mostrati né sbloccati.
const BADGE_DEFS: Array<{
  id: string;
  label: string;
  description: string;
  emoji: string;
  tier: BadgeTier;
  category: BadgeCategory;
  check: (s: StatsInput) => boolean;
  progress?: (s: StatsInput) => { current: number; target: number };
  appliesTo?: (sportRole: number | null | undefined) => boolean;
}> = [
  // ── Allenamenti (UX-59) ────────────────────────────────────────────────────
  // Contano solo le presenze segnate dagli allenatori alla chiusura
  // dell'allenamento: una presenza non segnata non si sa.
  presenceBadge("primo_allenamento", "Primo allenamento", 1, "👟", "bronze"),
  presenceBadge("dieci_allenamenti", "10 allenamenti", 10, "💪", "bronze"),
  presenceBadge("venticinque_allenamenti", "25 allenamenti", 25, "🎽", "silver"),
  presenceBadge("cinquanta_allenamenti", "50 allenamenti", 50, "🎖️", "gold"),
  {
    id: "mese_pieno",
    label: "Mese pieno",
    description: "Non saltare nessun allenamento per un mese intero, con almeno 4 allenamenti",
    emoji: "📅",
    tier: "silver",
    category: "allenamenti",
    check: (s) => hasFullMonth(trainingsOf(s)),
  },
  {
    id: "stagione_fedele",
    label: "Stagione fedele",
    description: "Fare almeno 8 allenamenti su 10 in una stagione",
    emoji: "💛",
    tier: "gold",
    category: "allenamenti",
    check: (s) => hasLoyalSeason(trainingsOf(s), s.currentSeason ?? getCurrentSeason()),
  },

  // ── Presenza ───────────────────────────────────────────────────────────────
  {
    id: "esordiente",
    label: "Esordiente",
    description: "Giocare la prima partita ufficiale",
    emoji: "🏀",
    tier: "bronze",
    category: "presenza",
    check: ({ matchStats }) => matchStats.length >= 1,
    progress: ({ matchStats }) => ({ current: Math.min(matchStats.length, 1), target: 1 }),
  },
  {
    id: "cinque_partite",
    label: "5 partite",
    description: "Giocare 5 partite ufficiali",
    emoji: "🖐️",
    tier: "bronze",
    category: "presenza",
    check: ({ matchStats }) => matchStats.length >= 5,
    progress: ({ matchStats }) => ({ current: Math.min(matchStats.length, 5), target: 5 }),
  },
  {
    id: "dieci_partite",
    label: "10 partite",
    description: "Giocare 10 partite ufficiali",
    emoji: "🔟",
    tier: "bronze",
    category: "presenza",
    check: ({ matchStats }) => matchStats.length >= 10,
    progress: ({ matchStats }) => ({ current: Math.min(matchStats.length, 10), target: 10 }),
  },
  {
    id: "venti_partite",
    label: "20 partite",
    description: "Giocare 20 partite ufficiali",
    emoji: "⭐",
    tier: "silver",
    category: "presenza",
    check: ({ matchStats }) => matchStats.length >= 20,
    progress: ({ matchStats }) => ({ current: Math.min(matchStats.length, 20), target: 20 }),
  },
  {
    id: "veterano",
    label: "Veterano",
    description: "Giocare 30 partite ufficiali",
    emoji: "🏆",
    tier: "gold",
    category: "presenza",
    check: ({ matchStats }) => matchStats.length >= 30,
    progress: ({ matchStats }) => ({ current: Math.min(matchStats.length, 30), target: 30 }),
  },
  {
    id: "fedelissimo",
    label: "Fedelissimo",
    description: "Giocare in 3 stagioni diverse",
    emoji: "♾️",
    tier: "silver",
    category: "presenza",
    check: ({ matchStats }) => distinctSeasons(matchStats) >= 3,
    progress: ({ matchStats }) => ({
      current: Math.min(distinctSeasons(matchStats), 3),
      target: 3,
    }),
  },

  // ── Punti ────────────────────────────────────────────────────────────────
  {
    id: "primo_canestro",
    label: "Primo canestro",
    description: "Segnare i primi punti in una partita ufficiale",
    emoji: "🎯",
    tier: "bronze",
    category: "punti",
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
    id: "doppia_cifra",
    label: "Doppia cifra",
    description: "Segnare almeno 10 punti in una partita",
    emoji: "💥",
    tier: "bronze",
    category: "punti",
    check: ({ matchStats }) => matchStats.some((m) => m.points >= 10),
    progress: ({ matchStats }) => ({
      current: Math.min(
        maxOf(matchStats, (m) => m.points),
        10
      ),
      target: 10,
    }),
  },
  {
    id: "bomber",
    label: "Bomber",
    description: "Segnare almeno 20 punti in una partita",
    emoji: "💣",
    tier: "silver",
    category: "punti",
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
    id: "centurione",
    label: "Centurione",
    description: "Segnare 100 punti in tutto",
    emoji: "💯",
    tier: "bronze",
    category: "punti",
    check: ({ matchStats }) => totalPoints(matchStats) >= 100,
    progress: ({ matchStats }) => ({
      current: Math.min(totalPoints(matchStats), 100),
      target: 100,
    }),
  },
  {
    id: "artigliere",
    label: "200 punti",
    description: "Segnare 200 punti in tutto",
    emoji: "🧨",
    tier: "silver",
    category: "punti",
    check: ({ matchStats }) => totalPoints(matchStats) >= 200,
    progress: ({ matchStats }) => ({
      current: Math.min(totalPoints(matchStats), 200),
      target: 200,
    }),
  },
  {
    id: "cannoniere",
    label: "Cannoniere",
    description: "Segnare 300 punti in tutto",
    emoji: "🎆",
    tier: "gold",
    category: "punti",
    check: ({ matchStats }) => totalPoints(matchStats) >= 300,
    progress: ({ matchStats }) => ({
      current: Math.min(totalPoints(matchStats), 300),
      target: 300,
    }),
  },

  // ── Precisione ─────────────────────────────────────────────────────────────
  {
    id: "cecchino",
    label: "Tre triple",
    description: "Segnare 3 canestri da 3 punti in una partita",
    emoji: "🏹",
    tier: "bronze",
    category: "precisione",
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
    id: "mira_acciaio",
    label: "Mira d'acciaio",
    description: "Segnare almeno 7 tiri su 10 in una partita, con almeno 5 tiri",
    emoji: "🪙",
    tier: "silver",
    category: "precisione",
    appliesTo: isR5,
    check: ({ matchStats }) =>
      matchStats.some((m) => m.shotsAttempted >= 5 && made(m) / m.shotsAttempted >= 0.7),
  },
  {
    id: "cecchino_perfetto",
    label: "Tutto a segno",
    description: "Segnare tutti i tiri di una partita, con almeno 3 tiri",
    emoji: "🟢",
    tier: "gold",
    category: "precisione",
    appliesTo: isR5,
    check: ({ matchStats }) =>
      matchStats.some((m) => m.shotsAttempted >= 3 && made(m) === m.shotsAttempted),
  },

  // ── Continuità ─────────────────────────────────────────────────────────────
  {
    id: "costante",
    label: "Costante",
    description: "Segnare in 5 partite di fila",
    emoji: "📈",
    tier: "silver",
    category: "continuita",
    check: ({ matchStats }) => longestStreak(matchStats, (m) => m.points >= 1) >= 5,
    progress: ({ matchStats }) => ({
      current: Math.min(
        longestStreak(matchStats, (m) => m.points >= 1),
        5
      ),
      target: 5,
    }),
  },
  {
    id: "in_fiamme",
    label: "In fiamme",
    description: "Segnare almeno 10 punti in 3 partite di fila",
    emoji: "🔥",
    tier: "gold",
    category: "continuita",
    check: ({ matchStats }) => longestStreak(matchStats, (m) => m.points >= 10) >= 3,
    progress: ({ matchStats }) => ({
      current: Math.min(
        longestStreak(matchStats, (m) => m.points >= 10),
        3
      ),
      target: 3,
    }),
  },

  // ── Vittorie ───────────────────────────────────────────────────────────────
  {
    id: "vincente",
    label: "Vincente",
    description: "Vincere 10 partite",
    emoji: "🏅",
    tier: "silver",
    category: "vittorie",
    check: ({ matchStats }) => winCount(matchStats) >= 10,
    progress: ({ matchStats }) => ({ current: Math.min(winCount(matchStats), 10), target: 10 }),
  },
  {
    id: "trascinatore",
    label: "Trascinatore",
    description: "Segnare almeno 20 punti in una partita vinta",
    emoji: "⚡",
    tier: "gold",
    category: "vittorie",
    check: ({ matchStats }) => matchStats.some((m) => m.won && m.points >= 20),
    progress: ({ matchStats }) => ({
      current: Math.min(
        maxOf(
          matchStats.filter((m) => m.won),
          (m) => m.points
        ),
        20
      ),
      target: 20,
    }),
  },

  // ── Premi ──────────────────────────────────────────────────────────────────
  {
    id: "mvp",
    label: "MVP",
    description: "Essere scelto come migliore in campo (MVP) in una partita",
    emoji: "🌟",
    tier: "silver",
    category: "premi",
    check: ({ mvpCount }) => mvpCount >= 1,
    progress: ({ mvpCount }) => ({ current: Math.min(mvpCount, 1), target: 1 }),
  },
  {
    id: "beniamino",
    label: "Beniamino",
    description: "Essere scelto come migliore in campo (MVP) 3 volte",
    emoji: "💫",
    tier: "gold",
    category: "premi",
    check: ({ mvpCount }) => mvpCount >= 3,
    progress: ({ mvpCount }) => ({ current: Math.min(mvpCount, 3), target: 3 }),
  },
  {
    id: "top_scorer",
    label: "Top scorer",
    description: "Segnare più punti di tutti nel proprio ruolo in una stagione",
    emoji: "👑",
    tier: "gold",
    category: "premi",
    check: ({ topScorerCount }) => topScorerCount >= 1,
    progress: ({ topScorerCount }) => ({ current: Math.min(topScorerCount, 1), target: 1 }),
  },

  // ── Speciali ─────────────────────────────────────────────────────────────
  {
    id: "tripla",
    label: "Tripla mista",
    description: "In una partita, segnare un canestro da 2 punti, uno da 3 punti e un tiro libero",
    emoji: "🎭",
    tier: "silver",
    category: "speciali",
    check: ({ matchStats }) =>
      matchStats.some((m) => m.twoPointers >= 1 && m.threePointers >= 1 && m.freeThrows >= 1),
  },
  {
    id: "mercenario",
    label: "In prestito",
    description: "Giocare una partita con un'altra squadra, in prestito",
    emoji: "🤝",
    tier: "bronze",
    category: "speciali",
    check: ({ matchStats }) => matchStats.some((m) => m.isLoan),
    progress: ({ matchStats }) => ({
      current: Math.min(matchStats.filter((m) => m.isLoan).length, 1),
      target: 1,
    }),
  },
  {
    id: "fair_play",
    label: "Fair play",
    description: "Giocare 10 partite senza marcare chi non si può marcare",
    emoji: "🕊️",
    tier: "silver",
    category: "speciali",
    appliesTo: isR4orR5,
    check: ({ matchStats }) =>
      matchStats.length >= 10 && matchStats.every((m) => m.illegalFouls === 0),
    progress: ({ matchStats }) => ({
      current: matchStats.every((m) => m.illegalFouls === 0) ? Math.min(matchStats.length, 10) : 0,
      target: 10,
    }),
  },
];

/** Etichette e ordine delle categorie per la vetrina a griglia. */
export const BADGE_CATEGORY_ORDER: BadgeCategory[] = [
  "punti",
  "precisione",
  "continuita",
  "vittorie",
  "presenza",
  "allenamenti",
  "premi",
  "speciali",
];
export const BADGE_CATEGORY_LABELS: Record<BadgeCategory, string> = {
  allenamenti: "Allenamenti",
  punti: "Punti",
  precisione: "Precisione",
  continuita: "Continuità",
  vittorie: "Vittorie",
  presenza: "Presenza",
  premi: "Premi",
  speciali: "Speciali",
};

/** Metadati di tutti i badge (senza la logica di check), per lookup in UI/notifiche. */
export const ALL_BADGES: Badge[] = BADGE_DEFS.map(
  ({ check: _c, progress: _p, appliesTo: _a, ...badge }) => badge
);

export function getBadgeById(id: string): Badge | undefined {
  return ALL_BADGES.find((b) => b.id === id);
}

const applies = (
  def: { appliesTo?: (r: number | null | undefined) => boolean },
  sportRole: number | null | undefined
) => !def.appliesTo || def.appliesTo(sportRole);

/** Badge attualmente sbloccati dal giocatore. */
export function computeBadges(input: StatsInput): Badge[] {
  return BADGE_DEFS.filter((def) => applies(def, input.sportRole) && def.check(input)).map(
    ({ check: _check, progress: _p, appliesTo: _a, ...badge }) => badge
  );
}

/**
 * Stato completo: badge sbloccati + badge ancora bloccati (con avanzamento).
 * I bloccati includono solo quelli con una funzione `progress` definita, così
 * la UI può sempre mostrare una barra "x/y". I badge non applicabili al ruolo
 * del giocatore vengono esclusi del tutto.
 */
export function computeBadgeState(input: StatsInput): { earned: Badge[]; locked: LockedBadge[] } {
  const earned: Badge[] = [];
  const locked: LockedBadge[] = [];
  for (const def of BADGE_DEFS) {
    if (!applies(def, input.sportRole)) continue;
    const { check, progress, appliesTo: _a, ...badge } = def;
    if (check(input)) {
      earned.push(badge);
    } else if (progress) {
      const { current, target } = progress(input);
      locked.push({ ...badge, current, target });
    }
  }
  return { earned, locked };
}

/** Badge con stato di sblocco e avanzamento (se disponibile). */
export type BadgeProgress = Badge & {
  earned: boolean;
  current?: number;
  target?: number;
};

/**
 * Tutti i badge applicabili al giocatore, con stato di sblocco e avanzamento —
 * per la pagina "vetrina traguardi" a griglia (sbloccati accesi, bloccati spenti).
 */
export function computeAllBadges(input: StatsInput): BadgeProgress[] {
  return BADGE_DEFS.filter((def) => applies(def, input.sportRole)).map((def) => {
    const { check, progress, appliesTo: _a, ...badge } = def;
    const earned = check(input);
    if (earned) return { ...badge, earned: true };
    const p = progress?.(input);
    return { ...badge, earned: false, current: p?.current, target: p?.target };
  });
}
