import { cache } from "react";
import { prisma } from "@/lib/db";
import { loadTrainingRecords, topScorerSeasons, type PlayerRef } from "@/lib/rating/badgeService";
import { firstNameOf } from "@/lib/rating/badgeShare";
import { isMinor, isMinorChild } from "@/lib/minors";
import {
  attendanceReminderDue,
  buildSeasonRecap,
  mergePersonStats,
  type ClubSeasonTotals,
  type RecapMatchStat,
  type SeasonRecap,
} from "@/lib/season/seasonRecap";

/**
 * Query del riepilogo di fine stagione (UX-60). I calcoli stanno in
 * `seasonRecap.ts`; qui si leggono le righe della persona (account e scheda
 * figlio collegata, `@/lib/person`) e i numeri del club.
 */

/** Dal 1° settembre al 1° settembre dopo, come `getCurrentSeason(date)`. */
export function seasonDateRange(season: string): { gte: Date; lt: Date } {
  const start = Number(season.slice(0, 4));
  return { gte: new Date(start, 8, 1), lt: new Date(start + 1, 8, 1) };
}

/** Le due chiavi della persona: l'account (se c'è) e la scheda figlio collegata. */
export interface PersonKeys {
  userId: string | null;
  childId: string | null;
}

/** Riferimento principale per i calcoli dei traguardi: l'account prima della scheda. */
export function primaryRef(keys: PersonKeys): PlayerRef {
  return keys.userId ? { userId: keys.userId } : { childId: keys.childId as string };
}

function keysWhere(keys: PersonKeys) {
  return [
    ...(keys.userId ? [{ userId: keys.userId }] : []),
    ...(keys.childId ? [{ childId: keys.childId }] : []),
  ];
}

/** Numeri del club nella stagione: allenamenti fatti, partite giocate, punti segnati. */
export const loadClubSeasonTotals = cache(async (season: string): Promise<ClubSeasonTotals> => {
  const range = seasonDateRange(season);
  const now = new Date();
  const [trainings, matches] = await Promise.all([
    prisma.trainingSession.count({
      where: { date: { gte: range.gte, lt: range.lt < now ? range.lt : now } },
    }),
    prisma.match.findMany({
      where: { team: { season }, result: { not: null } },
      select: { ourScore: true, theirScore: true, opponentTeamId: true },
    }),
  ]);
  // In un'amichevole interna i punti sono tutti nostri, da tutte e due le parti.
  const points = matches.reduce(
    (sum, m) => sum + (m.ourScore ?? 0) + (m.opponentTeamId ? (m.theirScore ?? 0) : 0),
    0
  );
  return { trainings, matches: matches.length, points };
});

export async function loadSeasonRecap(keys: PersonKeys, season: string): Promise<SeasonRecap> {
  const who = keysWhere(keys);
  const ref = primaryRef(keys);

  const [rawStats, mvps, sportRole, trainings, current, past, club] = await Promise.all([
    prisma.playerMatchStats.findMany({
      where: { OR: who },
      select: {
        points: true,
        twoPointers: true,
        threePointers: true,
        freeThrows: true,
        shotsAttempted: true,
        fouls: true,
        illegalFouls: true,
        isLoan: true,
        match: {
          select: {
            id: true,
            slug: true,
            date: true,
            result: true,
            opponentTeamId: true,
            team: { select: { season: true } },
            opponent: { select: { name: true } },
          },
        },
      },
    }),
    prisma.matchMvp.findMany({
      where: { OR: who },
      select: { matchId: true, match: { select: { team: { select: { season: true } } } } },
    }),
    keys.userId
      ? prisma.user
          .findUnique({
            where: { id: keys.userId },
            select: { sportRole: true, childAccount: { select: { sportRole: true } } },
          })
          .then((u) => u?.sportRole ?? u?.childAccount?.sportRole ?? null)
      : prisma.child
          .findUnique({ where: { id: keys.childId as string }, select: { sportRole: true } })
          .then((c) => c?.sportRole ?? null),
    loadTrainingRecords(ref),
    prisma.teamMembership.findMany({
      where: { OR: who, team: { season, isMixed: false } },
      select: { team: { select: { id: true, name: true, color: true } } },
    }),
    prisma.pastTeamMembership.findMany({
      where: { OR: who, team: { season, isMixed: false } },
      select: { team: { select: { id: true, name: true, color: true } } },
    }),
    loadClubSeasonTotals(season),
  ]);

  const matchStats: RecapMatchStat[] = mergePersonStats(
    rawStats.map((s) => ({
      matchId: s.match.id,
      slug: s.match.slug,
      // Nelle amichevoli interne non si sa da che parte giocava: niente nome.
      opponentName: s.match.opponentTeamId ? null : (s.match.opponent?.name ?? null),
      points: s.points,
      twoPointers: s.twoPointers,
      threePointers: s.threePointers,
      freeThrows: s.freeThrows,
      shotsAttempted: s.shotsAttempted,
      fouls: s.fouls,
      illegalFouls: s.illegalFouls,
      isLoan: s.isLoan,
      won: s.match.result === "WIN",
      date: s.match.date,
      season: s.match.team.season,
    }))
  );
  // Un MVP per partita, anche se compare su tutte e due le chiavi.
  const mvpSeasons = [...new Map(mvps.map((m) => [m.matchId, m.match.team.season])).values()];

  // La squadra di adesso prima di quelle lasciate durante la stagione.
  const teams = new Map<string, { name: string; color: string | null }>();
  for (const m of [...current, ...past]) {
    if (!teams.has(m.team.id)) teams.set(m.team.id, { name: m.team.name, color: m.team.color });
  }

  return buildSeasonRecap(
    {
      trainings,
      matchStats,
      mvpSeasons,
      topScorerSeasons: await topScorerSeasons(ref, sportRole),
      sportRole,
      teams: [...teams.values()],
    },
    season,
    club
  );
}

// ── Di chi è il riepilogo ────────────────────────────────────────────────────

export interface RecapSubject {
  keys: PersonKeys;
  /** Nome intero, per l'intestazione della pagina. */
  name: string;
  /** Solo il nome di battesimo, per l'immagine e le frasi. */
  firstName: string;
  minor: boolean;
  /** Id della scheda figlio, per `?per=`: null se il riepilogo è il proprio. */
  childId: string | null;
}

/** Il riepilogo proprio: l'account e, se c'è, la scheda figlio collegata. */
export async function loadSelfSubject(userId: string): Promise<RecapSubject | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, birthDate: true, childAccount: { select: { id: true } } },
  });
  if (!user) return null;
  return {
    keys: { userId: user.id, childId: user.childAccount?.id ?? null },
    name: user.name ?? "",
    firstName: firstNameOf(user.name),
    minor: isMinor(user.birthDate),
    childId: null,
  };
}

/** Il riepilogo di un figlio: se ha un account, i dati sono dell'account (`@/lib/person`). */
export async function loadChildSubject(childId: string): Promise<RecapSubject | null> {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: {
      id: true,
      name: true,
      birthDate: true,
      user: { select: { id: true, name: true, birthDate: true } },
    },
  });
  if (!child) return null;
  const name = child.user?.name ?? child.name;
  return {
    keys: { userId: child.user?.id ?? null, childId: child.id },
    name,
    firstName: firstNameOf(name),
    minor: child.user ? isMinor(child.user.birthDate) : isMinorChild(child.birthDate),
    childId: child.id,
  };
}

// ── Chi ha dati nella stagione ───────────────────────────────────────────────

/**
 * Le persone con almeno una presenza segnata o una partita nella stagione:
 * i traguardi arrivano solo da lì, quindi sono tutte quelle con un riepilogo.
 * Una persona = una voce (account, o scheda figlio senza account).
 */
export async function loadSeasonParticipants(season: string): Promise<PersonKeys[]> {
  const range = seasonDateRange(season);
  const [regs, stats] = await Promise.all([
    prisma.registration.findMany({
      where: { attended: true, session: { date: { gte: range.gte, lt: range.lt } } },
      select: { userId: true, childId: true, child: { select: { userId: true } } },
      distinct: ["userId", "childId"],
    }),
    prisma.playerMatchStats.findMany({
      where: { match: { team: { season } } },
      select: { userId: true, childId: true, child: { select: { userId: true } } },
      distinct: ["userId", "childId"],
    }),
  ]);
  const people = new Map<string, PersonKeys>();
  for (const r of [...regs, ...stats]) {
    const userId = r.userId ?? r.child?.userId ?? null;
    if (userId) {
      const cur = people.get(`u:${userId}`);
      people.set(`u:${userId}`, { userId, childId: cur?.childId ?? r.childId ?? null });
    } else if (r.childId) {
      people.set(`c:${r.childId}`, { userId: null, childId: r.childId });
    }
  }
  return [...people.values()];
}

// ── Riepiloghi pubblicati per chi guarda ─────────────────────────────────────

/** Per 30 giorni dalla pubblicazione il riepilogo è "pronto" (card in home e nel profilo). */
export const RECAP_FRESH_DAYS = 30;

/** La persona ha almeno una presenza segnata o una partita nella stagione? */
export async function personHasSeasonData(keys: PersonKeys, season: string): Promise<boolean> {
  const who = keysWhere(keys);
  if (who.length === 0) return false;
  const range = seasonDateRange(season);
  const [presence, match] = await Promise.all([
    prisma.registration.findFirst({
      where: { OR: who, attended: true, session: { date: { gte: range.gte, lt: range.lt } } },
      select: { id: true },
    }),
    prisma.playerMatchStats.findFirst({
      where: { OR: who, match: { team: { season } } },
      select: { id: true },
    }),
  ]);
  return presence != null || match != null;
}

export interface RecapLinkPerson {
  /** Null = il proprio riepilogo. */
  childId: string | null;
  firstName: string;
}

export interface RecapLinkSeason {
  season: string;
  publishedAt: Date;
  /** Pubblicato da meno di `RECAP_FRESH_DAYS`. */
  fresh: boolean;
  people: RecapLinkPerson[];
}

/**
 * Le stagioni pubblicate in cui chi guarda, o uno dei suoi figli, ha dei dati:
 * "Le tue stagioni" nel profilo e la card in home. La propria scheda figlio è
 * il proprio riepilogo, non un figlio.
 */
export const loadRecapLinks = cache(async (userId: string): Promise<RecapLinkSeason[]> => {
  const seasons = await prisma.season.findMany({
    where: { recapPublishedAt: { not: null } },
    orderBy: { label: "desc" },
    select: { label: true, recapPublishedAt: true },
  });
  if (seasons.length === 0) return [];

  const [self, kids] = await Promise.all([
    loadSelfSubject(userId),
    prisma.child.findMany({
      where: { guardians: { some: { userId } }, NOT: { userId } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);
  const kidSubjects = (await Promise.all(kids.map((k) => loadChildSubject(k.id)))).filter(
    (s): s is RecapSubject => s != null
  );
  const candidates = [...(self ? [self] : []), ...kidSubjects];
  const freshFrom = Date.now() - RECAP_FRESH_DAYS * 24 * 60 * 60 * 1000;

  const out: RecapLinkSeason[] = [];
  for (const s of seasons) {
    const has = await Promise.all(candidates.map((c) => personHasSeasonData(c.keys, s.label)));
    const people = candidates
      .filter((_, i) => has[i])
      .map((c) => ({ childId: c.childId, firstName: c.firstName }));
    if (people.length === 0) continue;
    const publishedAt = s.recapPublishedAt as Date;
    out.push({ season: s.label, publishedAt, fresh: publishedAt.getTime() >= freshFrom, people });
  }
  return out;
});

/**
 * Allenamenti già fatti della stagione senza nessuna presenza segnata: per
 * l'avviso della dashboard (da aprile, `attendanceReminderDue`). Zero se non è il periodo.
 */
export async function countUnmarkedTrainings(season: string, now = new Date()): Promise<number> {
  const seasonRow = await prisma.season.findUnique({
    where: { label: season },
    select: { recapPublishedAt: true },
  });
  if (!attendanceReminderDue(now, seasonRow?.recapPublishedAt != null)) return 0;
  const range = seasonDateRange(season);
  return prisma.trainingSession.count({
    where: {
      date: { gte: range.gte, lt: range.lt < now ? range.lt : now },
      registrations: { none: { attended: { not: null } } },
    },
  });
}
