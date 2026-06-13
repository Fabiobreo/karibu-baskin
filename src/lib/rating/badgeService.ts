import { prisma } from "@/lib/db";
import { computeBadges, getBadgeById } from "@/lib/rating/badges";
import { createAppNotification } from "@/lib/notifications/appNotifications";
import { sendPushToUsers } from "@/lib/notifications/webpush";

/** Riferimento a un giocatore: o un User o un Child (mutuamente esclusivi). */
export type PlayerRef =
  | { userId: string; childId?: undefined }
  | { userId?: undefined; childId: string };

/**
 * Costruisce lo StatsInput (partite, MVP, stagioni da 1° marcatore) necessario
 * al calcolo dei badge di un giocatore. Stessa semantica usata dal profilo
 * pubblico: include anche le partite giocate in prestito.
 */
export async function loadBadgeInput(ref: PlayerRef) {
  const where = ref.userId ? { userId: ref.userId } : { childId: ref.childId };
  const playerKey = ref.userId ? `u:${ref.userId}` : `c:${ref.childId}`;

  const [matchStats, mvpCount, memberships] = await Promise.all([
    prisma.playerMatchStats.findMany({
      where,
      select: { points: true, twoPointers: true, threePointers: true, freeThrows: true },
    }),
    prisma.matchMvp.count({ where }),
    prisma.teamMembership.findMany({
      where,
      select: { team: { select: { id: true, season: true } } },
    }),
  ]);

  // topScorerCount: per ogni (squadra, stagione) di cui il giocatore è membro,
  // verifica se è il 1° marcatore (prestiti esclusi, come sul profilo pubblico).
  let topScorerCount = 0;
  const pairs = memberships.map((m) => ({ teamId: m.team.id, season: m.team.season }));
  if (pairs.length > 0) {
    const relevant = await prisma.playerMatchStats.findMany({
      where: {
        isLoan: false,
        OR: pairs.map((p) => ({ match: { teamId: p.teamId, team: { season: p.season } } })),
      },
      select: {
        points: true,
        userId: true,
        childId: true,
        match: { select: { teamId: true, team: { select: { season: true } } } },
      },
    });
    // Aggrega punti per (teamId, season, playerKey)
    const agg = new Map<string, number>();
    for (const s of relevant) {
      const pk = s.userId ? `u:${s.userId}` : s.childId ? `c:${s.childId}` : null;
      if (!pk) continue;
      const key = `${s.match.teamId}::${s.match.team.season}::${pk}`;
      agg.set(key, (agg.get(key) ?? 0) + s.points);
    }
    // Trova il massimo per ciascun (teamId, season) e conta i primati del giocatore
    const maxByTeamSeason = new Map<string, { points: number; playerKey: string }>();
    for (const [key, points] of agg) {
      const [teamId, season, pk] = key.split("::");
      const ts = `${teamId}::${season}`;
      const cur = maxByTeamSeason.get(ts);
      if (points > 0 && (!cur || points > cur.points)) {
        maxByTeamSeason.set(ts, { points, playerKey: pk });
      }
    }
    for (const top of maxByTeamSeason.values()) {
      if (top.playerKey === playerKey) topScorerCount += 1;
    }
  }

  return { matchStats, mvpCount, topScorerCount };
}

/**
 * Ricalcola i badge del giocatore, persiste quelli nuovi in `EarnedBadge` e
 * (se `notify`) avvisa il giocatore — o il genitore, per i figli senza account.
 * Idempotente: i badge già registrati non rigenerano notifiche.
 * Pensata per uso fire-and-forget; ritorna gli id dei badge appena sbloccati.
 */
export async function reconcilePlayerBadges(
  ref: PlayerRef,
  opts: { notify: boolean } = { notify: false }
): Promise<string[]> {
  const where = ref.userId ? { userId: ref.userId } : { childId: ref.childId };

  const input = await loadBadgeInput(ref);
  const earnedIds = computeBadges(input).map((b) => b.id);
  if (earnedIds.length === 0) return [];

  const existing = await prisma.earnedBadge.findMany({ where, select: { badgeId: true } });
  const existingSet = new Set(existing.map((e) => e.badgeId));
  const newIds = earnedIds.filter((id) => !existingSet.has(id));
  if (newIds.length === 0) return [];

  await prisma.earnedBadge.createMany({
    data: newIds.map((badgeId) => ({ badgeId, ...where })),
    skipDuplicates: true,
  });

  if (opts.notify) {
    await notifyBadgeUnlock(ref, newIds).catch((err) =>
      console.error("[badges] notify unlock", err)
    );
  }

  return newIds;
}

/** Invia notifica in-app + push al destinatario corretto per i badge sbloccati. */
async function notifyBadgeUnlock(ref: PlayerRef, badgeIds: string[]): Promise<void> {
  let targetUserId: string | null = null;
  let subjectName: string | null = null;
  let profileSlug: string | null = null;
  let isSelf = false;

  if (ref.userId) {
    const user = await prisma.user.findUnique({
      where: { id: ref.userId },
      select: { id: true, name: true, slug: true },
    });
    if (!user) return;
    targetUserId = user.id;
    subjectName = user.name;
    profileSlug = user.slug ?? user.id;
    isSelf = true;
  } else {
    const child = await prisma.child.findUnique({
      where: { id: ref.childId },
      select: { name: true, slug: true, id: true, parentId: true, userId: true },
    });
    if (!child) return;
    // Notifica il genitore (i figli senza account non ricevono notifiche).
    targetUserId = child.userId ?? child.parentId;
    subjectName = child.name;
    profileSlug = child.slug ?? child.id;
  }

  if (!targetUserId) return;
  const url = `/giocatori/${profileSlug}`;

  for (const badgeId of badgeIds) {
    const badge = getBadgeById(badgeId);
    if (!badge) continue;
    const title = `${badge.emoji} Nuovo traguardo!`;
    const body = isSelf
      ? `Hai sbloccato il traguardo "${badge.label}" 🎉`
      : `${subjectName} ha sbloccato il traguardo "${badge.label}" 🎉`;

    await createAppNotification({ type: "BADGE_UNLOCKED", title, body, url, targetUserId });
  }

  // Una sola push riepilogativa se i badge sono più d'uno.
  const pushTitle =
    badgeIds.length === 1
      ? `${getBadgeById(badgeIds[0])?.emoji ?? "🏅"} Nuovo traguardo!`
      : "🏅 Nuovi traguardi sbloccati!";
  const pushBody =
    badgeIds.length === 1
      ? isSelf
        ? `Hai sbloccato "${getBadgeById(badgeIds[0])?.label}"`
        : `${subjectName} ha sbloccato "${getBadgeById(badgeIds[0])?.label}"`
      : isSelf
        ? `Hai sbloccato ${badgeIds.length} nuovi traguardi`
        : `${subjectName} ha sbloccato ${badgeIds.length} nuovi traguardi`;

  await sendPushToUsers([targetUserId], { title: pushTitle, body: pushBody, url });
}
