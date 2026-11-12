import { prisma } from "@/lib/db";
import { PUBLIC_PROFILE_SELECT, withProfileLink } from "@/lib/publicProfile";
import { loadBadgeInput, type PlayerRef } from "@/lib/rating/badgeService";
import { badgesUnlockedByMatch } from "@/lib/rating/badgesOfMatch";
import type { AnyMatchProp } from "@/components/matches/UpcomingMatchRow";

/**
 * Dati del dopo-partita (UX-58): la sezione "Per te" (i giocatori della
 * famiglia di chi guarda, con punti e traguardi di quella partita) e "E adesso"
 * (prossima partita della squadra, o il prossimo allenamento).
 */

interface StatLike {
  points: number;
  twoPointers: number;
  threePointers: number;
  freeThrows: number;
  shotsAttempted: number;
  user: { id: string; name: string | null; image: string | null } | null;
  child: { id: string; name: string; slug: string | null } | null;
}

interface CallupLike {
  user: { id: string; name: string | null; image: string | null; slug: string | null } | null;
  child: { id: string; name: string; slug: string | null } | null;
}

export interface ForYouRow {
  key: string;
  name: string;
  image: string | null;
  /** Segmento di `/giocatori/…`, o null se il profilo non è pubblico. */
  profileSlug: string | null;
  isViewer: boolean;
  /** Null: era fra i convocati, le statistiche non ci sono ancora. */
  stat: { points: number; made: number; attempted: number } | null;
  /** Traguardi sbloccati con questa partita (id di badges.ts). */
  badgeIds: string[];
}

/**
 * Righe di "Per te". `family` sono le schede figlio di chi guarda (e la sua):
 * una scheda collegata a un account è la stessa persona dell'account
 * (@/lib/person), e i dati sportivi stanno sull'account.
 */
export async function loadForYouRows(opts: {
  viewerId: string;
  family: { id: string; userId: string | null }[];
  stats: StatLike[];
  callups: CallupLike[];
  matchDate: Date;
}): Promise<ForYouRow[]> {
  const { viewerId, family, stats, callups, matchDate } = opts;
  const accountOfChild = new Map(family.map((c) => [c.id, c.userId]));
  const familyUsers = new Set([viewerId, ...family.flatMap((c) => (c.userId ? [c.userId] : []))]);
  const keyOf = (p: { user: { id: string } | null; child: { id: string } | null }) => {
    if (p.user) return familyUsers.has(p.user.id) ? `u:${p.user.id}` : null;
    if (p.child && accountOfChild.has(p.child.id)) {
      const account = accountOfChild.get(p.child.id);
      return account ? `u:${account}` : `c:${p.child.id}`;
    }
    return null;
  };

  const rows = new Map<string, Omit<ForYouRow, "badgeIds">>();
  const childSlugs = new Map<string, string | null>();
  const hasStats = stats.length > 0;
  for (const s of stats) {
    const key = keyOf(s);
    if (!key) continue;
    const person = s.user ?? s.child!;
    if (s.child) childSlugs.set(s.child.id, s.child.slug);
    rows.set(key, {
      key,
      name: person.name ?? "—",
      image: s.user?.image ?? null,
      profileSlug: null,
      isViewer: key === `u:${viewerId}`,
      stat: {
        points: s.points,
        made: s.twoPointers + s.threePointers + s.freeThrows,
        attempted: s.shotsAttempted,
      },
    });
  }
  for (const c of callups) {
    const key = keyOf(c);
    if (!key) continue;
    const person = c.user ?? c.child!;
    const existing = rows.get(key);
    rows.set(key, {
      key,
      name: existing?.name ?? person.name ?? "—",
      image: existing?.image ?? c.user?.image ?? null,
      // Il link viene dai convocati, già passati da withProfileLink.
      profileSlug: c.user ? c.user.slug : (c.child?.slug ?? c.child?.id ?? null),
      isViewer: key === `u:${viewerId}`,
      // A statistiche inserite, un convocato senza riga ha giocato senza punti.
      stat: existing?.stat ?? (hasStats ? { points: 0, made: 0, attempted: 0 } : null),
    });
  }

  // Chi ha statistiche ma non è fra i convocati (partite inserite senza
  // convocazioni): il link al profilo si decide qui, con la stessa regola.
  const missing = [...rows.values()].filter((r) => r.profileSlug === null);
  const missingUsers = missing.filter((r) => r.key.startsWith("u:")).map((r) => r.key.slice(2));
  if (missingUsers.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: missingUsers } },
      select: { id: true, slug: true, sportRole: true, ...PUBLIC_PROFILE_SELECT },
    });
    for (const u of users) {
      const row = rows.get(`u:${u.id}`);
      if (row) row.profileSlug = withProfileLink(u).slug;
    }
  }
  for (const r of missing) {
    if (r.key.startsWith("c:")) r.profileSlug = childSlugs.get(r.key.slice(2)) ?? r.key.slice(2);
  }

  const list = [...rows.values()].sort(
    (a, b) => Number(b.isViewer) - Number(a.isViewer) || a.name.localeCompare(b.name, "it")
  );
  return Promise.all(
    list.map(async (row) => ({
      ...row,
      badgeIds: row.stat ? await badgesOfMatch(refOf(row.key), matchDate) : [],
    }))
  );
}

function refOf(key: string): PlayerRef {
  const id = key.slice(2);
  return key.startsWith("u:") ? { userId: id } : { childId: id };
}

async function badgesOfMatch(ref: PlayerRef, matchDate: Date): Promise<string[]> {
  const where = ref.userId ? { userId: ref.userId } : { childId: ref.childId };
  const [input, mvps] = await Promise.all([
    loadBadgeInput(ref),
    prisma.matchMvp.findMany({ where, select: { match: { select: { date: true } } } }),
  ]);
  return badgesUnlockedByMatch(
    input,
    mvps.map((m) => m.match.date),
    matchDate
  ).map((b) => b.id);
}

export type NextUp =
  | { kind: "match"; match: AnyMatchProp; teamName: string; teamColor: string | null }
  | {
      kind: "training";
      href: string;
      title: string;
      date: Date;
      location: string | null;
    }
  | null;

/**
 * "E adesso": la prossima partita della stessa squadra; se non ce n'è una in
 * calendario, il prossimo allenamento; altrimenti niente.
 */
export async function loadNextUp(
  team: { id: string; name: string; color: string | null },
  now: Date
): Promise<NextUp> {
  const next = await prisma.match.findFirst({
    where: { teamId: team.id, date: { gt: now } },
    orderBy: { date: "asc" },
    select: {
      id: true,
      slug: true,
      date: true,
      isHome: true,
      matchType: true,
      ourScore: true,
      theirScore: true,
      result: true,
      venue: true,
      opponent: { select: { id: true, name: true, city: true } },
      opponentTeam: { select: { id: true, name: true } },
    },
  });
  if (next) {
    const { opponent, opponentTeam, ...rest } = next;
    return {
      kind: "match",
      teamName: team.name,
      teamColor: team.color,
      match: {
        ...rest,
        opponent: opponent ?? {
          id: opponentTeam?.id ?? "",
          name: opponentTeam?.name ?? "",
          city: null,
        },
      },
    };
  }
  const training = await prisma.trainingSession.findFirst({
    where: { date: { gt: now } },
    orderBy: { date: "asc" },
    select: { id: true, dateSlug: true, title: true, date: true, location: true },
  });
  if (!training) return null;
  return {
    kind: "training",
    href: `/allenamento/${training.dateSlug ?? training.id}`,
    title: training.title,
    date: training.date,
    location: training.location,
  };
}
