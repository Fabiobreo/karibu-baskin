// ── Dati del tracker "Sviluppo giocatori" (/admin/sviluppo) ──────────────────
//
// Legge lo storico dei livelli stimati (`RatingUpdate`) e lo trasforma in curve
// per giocatore, più le ultime partite giocate, così l'allenatore riconosce da
// dove arriva una salita o un calo. Solo staff: μ e σ restano sul server della
// pagina admin e nel client servono solo a disegnare, mai come numeri.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { TEAM_META } from "@/lib/constants";
import { parseSnapshot, type PlayerRef } from "@/lib/rating/ratingEngine";
import type { CurvePoint } from "@/lib/rating/ratingTrend";
import { getCurrentSeasonLabel } from "@/lib/season/activeSeason";

export interface TrackedPoint extends CurvePoint {
  at: string;
}

export interface RecentGame {
  at: string;
  kind: "training" | "official";
  label: string;
  outcome: "vinta" | "persa" | "pari" | null;
  /** Punteggio dal lato del giocatore ("14-9"), null se manca. */
  score: string | null;
}

export interface TrackedAthlete {
  id: string;
  kind: "user" | "child";
  name: string;
  sportRole: number | null;
  sportRoleVariant: string | null;
  gender: "MALE" | "FEMALE" | null;
  mu: number;
  sigma: number;
  points: TrackedPoint[];
  /** Partitelle che hanno contribuito al livello. */
  games: number;
  officialGames: number;
  /** Ultime partite giocate, dalla più recente. */
  recentGames: RecentGame[];
}

export interface TrackerSummary {
  /** Partitelle con il punteggio registrato in questa stagione. */
  seasonGames: number;
  /** Allenamenti in cui ci sono state. */
  seasonSessions: number;
  lastSessionAt: string | null;
}

const RECENT_GAMES = 5;

/** Casacca con l'articolo: "gli Arancioni", "i Neri", "i Bianchi". */
function bibName(letter: string | undefined): string {
  const name = TEAM_META.find((t) => t.key === `team${letter ?? ""}`)?.name;
  if (!name) return "l'altra squadra";
  return `${/^[AEIOU]/.test(name) ? "gli" : "i"} ${name}`;
}

function outcomeOf(own: number, other: number): RecentGame["outcome"] {
  return own > other ? "vinta" : own < other ? "persa" : "pari";
}

/**
 * Chiavi con cui la persona può comparire negli snapshot delle partitelle:
 * un account con una scheda figlio collegata è una persona sola (@/lib/person),
 * e gli snapshot di prima del collegamento nominano solo la scheda.
 */
function personRefs(
  kind: "user" | "child",
  id: string,
  childOfUser: Map<string, string[]>,
  userOfChild: Map<string, string>
) {
  if (kind === "user") return { userIds: [id], childIds: childOfUser.get(id) ?? [] };
  const userId = userOfChild.get(id);
  return { userIds: userId ? [userId] : [], childIds: [id] };
}

const refMatches = (ref: PlayerRef, p: { userIds: string[]; childIds: string[] }) =>
  (!!ref.userId && p.userIds.includes(ref.userId)) ||
  (!!ref.childId && p.childIds.includes(ref.childId));

/** Finestra della stagione in corso (quella segnata dallo staff), dal pre-campionato di agosto. */
function seasonWindow(label: string): { gte: Date; lt: Date } {
  const year = Number(label.slice(0, 4));
  return { gte: new Date(year, 7, 1), lt: new Date(year + 1, 7, 1) };
}

export async function loadDevelopmentTracker(): Promise<{
  athletes: TrackedAthlete[];
  summary: TrackerSummary;
}> {
  const season = seasonWindow(await getCurrentSeasonLabel());
  const playerSelect = {
    id: true,
    name: true,
    sportRole: true,
    sportRoleVariant: true,
    gender: true,
    ratingMu: true,
    ratingSigma: true,
  } as const;

  const [users, children, updates, seasonResults, linkedChildren] = await Promise.all([
    prisma.user.findMany({ where: { ratingMu: { not: null } }, select: playerSelect }),
    prisma.child.findMany({ where: { ratingMu: { not: null } }, select: playerSelect }),
    prisma.ratingUpdate.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        userId: true,
        childId: true,
        muAfter: true,
        sigmaAfter: true,
        reason: true,
        sourceId: true,
        createdAt: true,
      },
    }),
    // Solo le partitelle che muovono il livello: senza snapshot il ricalcolo le salta.
    prisma.trainingMatchResult.findMany({
      where: { session: { date: season }, rostersSnapshot: { not: Prisma.DbNull } },
      select: { sessionId: true, session: { select: { date: true } } },
    }),
    prisma.child.findMany({
      where: { userId: { not: null } },
      select: { id: true, userId: true },
    }),
  ]);
  const childOfUser = new Map<string, string[]>();
  const userOfChild = new Map<string, string>();
  for (const c of linkedChildren) {
    if (!c.userId) continue;
    childOfUser.set(c.userId, [...(childOfUser.get(c.userId) ?? []), c.id]);
    userOfChild.set(c.id, c.userId);
  }

  // Curve per giocatore e, per ciascuno, gli id delle ultime partite.
  const byKey = new Map<
    string,
    { points: TrackedPoint[]; games: number; officialGames: number; sources: string[] }
  >();
  for (const u of updates) {
    const key = u.userId ? `user:${u.userId}` : u.childId ? `child:${u.childId}` : null;
    if (!key) continue;
    const entry = byKey.get(key) ?? { points: [], games: 0, officialGames: 0, sources: [] };
    const kind =
      u.reason === "TRAINING_MATCH"
        ? "training"
        : u.reason === "OFFICIAL_MATCH"
          ? "official"
          : "other";
    entry.points.push({ mu: u.muAfter, sigma: u.sigmaAfter, kind, at: u.createdAt.toISOString() });
    if (kind === "training") entry.games++;
    if (kind === "official") entry.officialGames++;
    if (kind !== "other" && u.sourceId) entry.sources.push(`${kind}:${u.sourceId}`);
    byKey.set(key, entry);
  }

  // Solo le partite che finiscono nel dettaglio: al più 5 per giocatore.
  const wanted = new Set<string>();
  for (const e of byKey.values()) for (const s of e.sources.slice(-RECENT_GAMES)) wanted.add(s);
  const idsOf = (kind: string) =>
    [...wanted].filter((s) => s.startsWith(`${kind}:`)).map((s) => s.slice(kind.length + 1));

  const [trainingResults, officialMatches] = await Promise.all([
    prisma.trainingMatchResult.findMany({
      where: { id: { in: idsOf("training") } },
      select: {
        id: true,
        matchup: true,
        scoreA: true,
        scoreB: true,
        rostersSnapshot: true,
        session: { select: { date: true } },
      },
    }),
    prisma.match.findMany({
      where: { id: { in: idsOf("official") } },
      select: {
        id: true,
        date: true,
        ourScore: true,
        theirScore: true,
        result: true,
        team: { select: { name: true } },
        opponent: { select: { name: true } },
      },
    }),
  ]);
  const trainingById = new Map(trainingResults.map((r) => [r.id, r]));
  const officialById = new Map(officialMatches.map((m) => [m.id, m]));

  function recentGame(source: string, kind: "user" | "child", id: string): RecentGame | null {
    const sep = source.indexOf(":");
    const type = source.slice(0, sep);
    const sourceId = source.slice(sep + 1);
    if (type === "training") {
      const r = trainingById.get(sourceId);
      const snap = r && parseSnapshot(r.rostersSnapshot);
      if (!r || !snap) return null;
      // teamA dello snapshot è la prima squadra del matchup ("AB", "AC", "BC").
      const [first, second] = (r.matchup ?? "AB").split("");
      const person = personRefs(kind, id, childOfUser, userOfChild);
      const inA = snap.teamA.some((p) => refMatches(p, person));
      const inB = snap.teamB.some((p) => refMatches(p, person));
      // Mai indovinare il lato: un punteggio rovesciato è peggio di nessun punteggio.
      if (inA === inB) {
        return {
          at: r.session.date.toISOString(),
          kind: "training",
          label: "Partitella",
          outcome: null,
          score: null,
        };
      }
      const [own, other] = inA ? [r.scoreA, r.scoreB] : [r.scoreB, r.scoreA];
      const [ownBib, otherBib] = inA ? [first, second] : [second, first];
      return {
        at: r.session.date.toISOString(),
        kind: "training",
        label: `Partitella con ${bibName(ownBib)} contro ${bibName(otherBib)}`,
        outcome: outcomeOf(own, other),
        score: `${own}-${other}`,
      };
    }
    const m = officialById.get(sourceId);
    if (!m) return null;
    return {
      at: m.date.toISOString(),
      kind: "official",
      label: `${m.team.name} - ${m.opponent?.name ?? "avversaria"}`,
      outcome:
        m.result === "WIN" ? "vinta" : m.result === "LOSS" ? "persa" : m.result ? "pari" : null,
      score: m.ourScore != null && m.theirScore != null ? `${m.ourScore}-${m.theirScore}` : null,
    };
  }

  const athletes: TrackedAthlete[] = [
    ...users.map((u) => ({ ...u, kind: "user" as const, name: u.name ?? "Senza nome" })),
    ...children.map((c) => ({ ...c, kind: "child" as const })),
  ].map((a) => {
    const entry = byKey.get(`${a.kind}:${a.id}`);
    return {
      id: a.id,
      kind: a.kind,
      name: a.name,
      sportRole: a.sportRole,
      sportRoleVariant: a.sportRoleVariant,
      gender: a.gender,
      mu: a.ratingMu!,
      sigma: a.ratingSigma!,
      points: entry?.points ?? [],
      games: entry?.games ?? 0,
      officialGames: entry?.officialGames ?? 0,
      recentGames: (entry?.sources.slice(-RECENT_GAMES) ?? [])
        .reverse()
        .map((s) => recentGame(s, a.kind, a.id))
        .filter((g): g is RecentGame => g !== null),
    };
  });

  const lastSession = seasonResults.reduce<Date | null>(
    (acc, r) => (!acc || r.session.date > acc ? r.session.date : acc),
    null
  );

  return {
    athletes,
    summary: {
      seasonGames: seasonResults.length,
      seasonSessions: new Set(seasonResults.map((r) => r.sessionId)).size,
      lastSessionAt: lastSession?.toISOString() ?? null,
    },
  };
}
