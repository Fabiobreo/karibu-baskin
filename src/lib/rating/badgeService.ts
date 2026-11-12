import { prisma } from "@/lib/db";
import {
  computeBadges,
  getBadgeById,
  type StatsInput,
  type TrainingRecord,
} from "@/lib/rating/badges";
import { checkRegistrationAllowed } from "@/lib/registrationRestrictions";
import { loadTeamPeriods, wasMemberAt, type TeamPeriod } from "@/lib/matches/teamHistory";
import { getCurrentSeason } from "@/lib/season/seasonUtils";
import { getCurrentSeasonLabel } from "@/lib/season/activeSeason";
import {
  badgeNotificationUrl,
  badgeSharePath,
  firstNameOf,
  type BadgeShareSubject,
} from "@/lib/rating/badgeShare";
import { isMinor, isMinorChild } from "@/lib/minors";
import { userHasPublicProfile } from "@/lib/publicProfile";
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
export async function loadBadgeInput(ref: PlayerRef): Promise<StatsInput> {
  const where = ref.userId ? { userId: ref.userId } : { childId: ref.childId };
  const [rawStats, mvpCount, memberships, sportRole, trainings, currentSeason] = await Promise.all([
    prisma.playerMatchStats.findMany({
      where,
      select: {
        points: true,
        twoPointers: true,
        threePointers: true,
        freeThrows: true,
        shotsAttempted: true,
        fouls: true,
        illegalFouls: true,
        isLoan: true,
        match: { select: { date: true, result: true, team: { select: { season: true } } } },
      },
    }),
    prisma.matchMvp.count({ where }),
    prisma.teamMembership.findMany({
      where,
      select: { team: { select: { id: true, season: true } } },
    }),
    ref.userId
      ? prisma.user
          .findUnique({ where: { id: ref.userId }, select: { sportRole: true } })
          .then((u) => u?.sportRole ?? null)
      : prisma.child
          .findUnique({ where: { id: ref.childId }, select: { sportRole: true } })
          .then((c) => c?.sportRole ?? null),
    loadTrainingRecords(ref),
    getCurrentSeasonLabel(),
  ]);

  const matchStats = rawStats.map((s) => ({
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
  }));

  const topScorerCount = (await topScorerSeasons(ref, sportRole, memberships)).length;

  return { matchStats, trainings, currentSeason, mvpCount, topScorerCount, sportRole };
}

/**
 * Stagioni in cui il giocatore è stato il 1° marcatore del proprio ruolo in una
 * sua squadra (una voce per squadra): il traguardo "Top scorer" e, per il
 * riepilogo di fine stagione (UX-60), la stagione in cui è arrivato.
 */
export async function topScorerSeasons(
  ref: PlayerRef,
  sportRole: number | null,
  memberships?: { team: { id: string; season: string } }[]
): Promise<string[]> {
  const playerKey = ref.userId ? `u:${ref.userId}` : `c:${ref.childId}`;
  if (!memberships) {
    memberships = await prisma.teamMembership.findMany({
      where: ref.userId ? { userId: ref.userId } : { childId: ref.childId },
      select: { team: { select: { id: true, season: true } } },
    });
  }
  // topScorerCount: per ogni (squadra, stagione) di cui il giocatore è membro,
  // verifica se è il 1° marcatore DEL PROPRIO RUOLO (prestiti esclusi). Il
  // confronto è limitato ai giocatori dello stesso ruolo Baskin: paragonare i
  // punti tra ruoli diversi (R1 vs R5) non sarebbe equo.
  const seasons: string[] = [];
  const pairs = memberships.map((m) => ({ teamId: m.team.id, season: m.team.season }));
  if (pairs.length > 0 && sportRole != null) {
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

    // Ruolo (attuale) di ogni marcatore, per limitare il confronto allo stesso ruolo.
    const uIds = [...new Set(relevant.map((s) => s.userId).filter((x): x is string => !!x))];
    const cIds = [...new Set(relevant.map((s) => s.childId).filter((x): x is string => !!x))];
    const [statUsers, statChildren] = await Promise.all([
      uIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: uIds } },
            select: { id: true, sportRole: true },
          })
        : [],
      cIds.length > 0
        ? prisma.child.findMany({
            where: { id: { in: cIds } },
            select: { id: true, sportRole: true },
          })
        : [],
    ]);
    const roleByKey = new Map<string, number | null>();
    for (const u of statUsers) roleByKey.set(`u:${u.id}`, u.sportRole);
    for (const c of statChildren) roleByKey.set(`c:${c.id}`, c.sportRole);

    // Aggrega punti per (teamId, season, playerKey), solo per i giocatori dello stesso ruolo.
    const agg = new Map<string, number>();
    for (const s of relevant) {
      const pk = s.userId ? `u:${s.userId}` : s.childId ? `c:${s.childId}` : null;
      if (!pk || roleByKey.get(pk) !== sportRole) continue;
      const key = `${s.match.teamId}::${s.match.team.season}::${pk}`;
      agg.set(key, (agg.get(key) ?? 0) + s.points);
    }
    // Trova il massimo per ciascun (teamId, season) e conta i primati del giocatore
    const maxByTeamSeason = new Map<
      string,
      { points: number; playerKey: string; season: string }
    >();
    for (const [key, points] of agg) {
      const [teamId, season, pk] = key.split("::");
      const ts = `${teamId}::${season}`;
      const cur = maxByTeamSeason.get(ts);
      if (points > 0 && (!cur || points > cur.points)) {
        maxByTeamSeason.set(ts, { points, playerKey: pk, season });
      }
    }
    for (const top of maxByTeamSeason.values()) {
      if (top.playerKey === playerKey) seasons.push(top.season);
    }
  }
  return seasons;
}

/**
 * Allenamenti per i traguardi di costanza (UX-59): quelli in cui lo staff ha
 * segnato le presenze, se la persona poteva iscriversi (ruolo e squadra di
 * quel giorno) o se c'era. Persona unica (`@/lib/person`): account e scheda
 * figlio collegata sommano le presenze.
 */
export async function loadTrainingRecords(ref: PlayerRef): Promise<TrainingRecord[]> {
  // Le due chiavi della persona, e il suo ruolo Baskin (l'account prima della scheda).
  let userId: string | null = null;
  let childId: string | null = null;
  let sportRole: number | null = null;
  if (ref.userId) {
    const user = await prisma.user.findUnique({
      where: { id: ref.userId },
      select: {
        id: true,
        sportRole: true,
        childAccount: { select: { id: true, sportRole: true } },
      },
    });
    if (!user) return [];
    userId = user.id;
    childId = user.childAccount?.id ?? null;
    sportRole = user.sportRole ?? user.childAccount?.sportRole ?? null;
  } else {
    const child = await prisma.child.findUnique({
      where: { id: ref.childId },
      select: { id: true, sportRole: true, user: { select: { id: true, sportRole: true } } },
    });
    if (!child) return [];
    childId = child.id;
    userId = child.user?.id ?? null;
    sportRole = child.user?.sportRole ?? child.sportRole ?? null;
  }
  const keys = [...(userId ? [{ userId }] : []), ...(childId ? [{ childId }] : [])];

  const [sessions, present, periodsByKey] = await Promise.all([
    prisma.trainingSession.findMany({
      where: { registrations: { some: { attended: { not: null } } } },
      select: { id: true, date: true, allowedRoles: true, restrictTeamId: true, openRoles: true },
    }),
    prisma.registration.findMany({
      where: { OR: keys, attended: true },
      select: { sessionId: true },
    }),
    loadTeamPeriods(userId ? [userId] : [], childId ? [childId] : []),
  ]);
  const presentIds = new Set(present.map((r) => r.sessionId));
  const periods: TeamPeriod[] = [...periodsByKey.values()].flat();

  // Squadre coinvolte: quelle riservatarie e quelle della persona, per la
  // Karibu di stagione (riservata a tutti i giocatori della stagione).
  const teamIds = [
    ...new Set([
      ...sessions.map((s) => s.restrictTeamId).filter((x): x is string => !!x),
      ...periods.map((p) => p.teamId),
    ]),
  ];
  const teams = teamIds.length
    ? await prisma.competitiveTeam.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, season: true, isMixed: true },
      })
    : [];
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const memberOf = (teamId: string, date: Date): boolean => {
    const team = teamById.get(teamId);
    if (!team?.isMixed) return wasMemberAt(periods, teamId, date);
    return periods.some((p) => {
      const own = teamById.get(p.teamId);
      return (
        own != null &&
        !own.isMixed &&
        own.season === team.season &&
        wasMemberAt(periods, p.teamId, date)
      );
    });
  };

  const records: TrainingRecord[] = [];
  for (const s of sessions) {
    const attended = presentIds.has(s.id);
    // "ATHLETE": conta se poteva iscriversi come giocatore, anche per lo staff
    // che gioca (un admin passerebbe ovunque e perderebbe il "Mese pieno").
    const eligible =
      sportRole != null &&
      checkRegistrationAllowed(
        s,
        "ATHLETE",
        sportRole,
        s.restrictTeamId ? memberOf(s.restrictTeamId, s.date) : false
      ).allowed;
    if (!attended && !eligible) continue;
    records.push({ date: s.date, season: getCurrentSeason(s.date), attended });
  }
  return records;
}

/**
 * Ricalcola i badge del giocatore, persiste quelli nuovi in `EarnedBadge` e
 * (se `notify`) avvisa il giocatore — o il genitore, per i figli senza account.
 * Idempotente: i badge già registrati non rigenerano notifiche.
 * Pensata per girare dopo la risposta (`inBackground`); ritorna gli id dei badge appena sbloccati.
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

/**
 * Invia notifica in-app + push per i badge sbloccati: all'atleta, se ha un
 * account ("Hai sbloccato…"), e ai suoi genitori ("Luca ha sbloccato…"). Un
 * account con una scheda figlio collegata è la stessa persona (@/lib/person).
 */
async function notifyBadgeUnlock(ref: PlayerRef, badgeIds: string[]): Promise<void> {
  let selfId: string | null = null;
  let guardianIds: string[] = [];
  let subjectName: string | null = null;

  if (ref.userId) {
    const user = await prisma.user.findUnique({
      where: { id: ref.userId },
      select: {
        id: true,
        name: true,
        childAccount: { select: { guardians: { select: { userId: true } } } },
      },
    });
    if (!user) return;
    selfId = user.id;
    guardianIds = user.childAccount?.guardians.map((g) => g.userId) ?? [];
    subjectName = user.name;
  } else {
    const child = await prisma.child.findUnique({
      where: { id: ref.childId },
      select: {
        name: true,
        userId: true,
        guardians: { select: { userId: true } },
      },
    });
    if (!child) return;
    selfId = child.userId;
    guardianIds = child.guardians.map((g) => g.userId);
    subjectName = child.name;
  }
  guardianIds = guardianIds.filter((id) => id !== selfId);

  // L'avviso porta al traguardo nel profilo (UX-59), dove c'è "Condividi".
  const ownerKey = (ref.userId ?? ref.childId) as string;
  const audiences = [
    { ids: selfId ? [selfId] : [], isSelf: true },
    { ids: guardianIds, isSelf: false },
  ].filter((a) => a.ids.length > 0);

  for (const { ids, isSelf } of audiences) {
    for (const badgeId of badgeIds) {
      const badge = getBadgeById(badgeId);
      if (!badge) continue;
      const title = `${badge.emoji} Nuovo traguardo!`;
      const body = isSelf
        ? `Hai sbloccato il traguardo "${badge.label}" 🎉`
        : `${subjectName} ha sbloccato il traguardo "${badge.label}" 🎉`;
      for (const targetUserId of ids) {
        await createAppNotification({
          type: "BADGE_UNLOCKED",
          title,
          body,
          url: badgeNotificationUrl(badgeId, ownerKey, isSelf),
          targetUserId,
        });
      }
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

    const url =
      badgeIds.length === 1
        ? badgeNotificationUrl(badgeIds[0], ownerKey, isSelf)
        : isSelf
          ? "/profilo"
          : "/profilo?tab=famiglia";
    await sendPushToUsers(ids, { title: pushTitle, body: pushBody, url, type: "BADGE_UNLOCKED" });
  }
}

/**
 * Chi compare sulla card di un traguardo (UX-59): nome di battesimo, se è
 * minorenne e la pagina del link. `self` = il proprio profilo.
 */
export async function loadBadgeShareSubject(
  ref: PlayerRef,
  self: boolean
): Promise<BadgeShareSubject | null> {
  if (ref.userId) {
    const user = await prisma.user.findUnique({
      where: { id: ref.userId },
      select: {
        id: true,
        name: true,
        slug: true,
        birthDate: true,
        appRole: true,
        sportRole: true,
        _count: { select: { matchStats: true } },
      },
    });
    if (!user) return null;
    const minor = isMinor(user.birthDate);
    const isPublic = userHasPublicProfile({
      appRole: user.appRole,
      sportRole: user.sportRole,
      matchesPlayed: user._count.matchStats,
    });
    return {
      firstName: firstNameOf(user.name),
      minor,
      path: badgeSharePath({ minor, profileSlug: isPublic ? (user.slug ?? user.id) : null }),
      self,
    };
  }
  const child = await prisma.child.findUnique({
    where: { id: ref.childId },
    select: { id: true, name: true, slug: true, birthDate: true },
  });
  if (!child) return null;
  const minor = isMinorChild(child.birthDate);
  return {
    firstName: firstNameOf(child.name),
    minor,
    path: badgeSharePath({ minor, profileSlug: child.slug ?? child.id }),
    self,
  };
}
