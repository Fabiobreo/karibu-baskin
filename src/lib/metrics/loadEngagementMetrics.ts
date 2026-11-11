import { prisma } from "@/lib/db";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/sessionPolicy";
import { MEMBER_APP_ROLES } from "@/lib/authRoles";
import { groupFamilies } from "@/lib/familyLinks";
import { romeDay } from "@/lib/notifications/pushStatTypes";
import { loadSeasonRosterSizes } from "@/lib/metrics/loadAdminMetrics";
import {
  activeUserIds,
  computeAvailabilityEngagement,
  computeFamilyActivity,
  computeGuestFunnel,
  computeNotificationOpens,
  computeRegistrationSource,
  overallPushOpenRate,
  summarizeShareVisits,
  type AvailabilityEngagement,
  type FamilyActivity,
  type GuestFunnel,
  type NotificationOpenRow,
  type NotificationOpenStat,
  type RegistrationSource,
  type ShareVisitSummary,
} from "@/lib/metrics/adminMetrics";

/**
 * Misure di coinvolgimento (UX-55) per `/admin/metriche`. Ogni misura c'è due
 * volte: oggi e quattro settimane fa (`previous`), per il confronto.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Distanza del confronto: "rispetto al mese scorso". */
export const COMPARE_DAYS = 28;
export const ACTIVITY_WINDOW_DAYS = 7;
export const ACTIVITY_HISTORY_WEEKS = 12;
export const AVAILABILITY_WINDOW_DAYS = 56;
export const REGISTRATION_WINDOW_DAYS = 28;
export const FUNNEL_WINDOW_DAYS = 182;
export const NOTIFICATION_WINDOW_DAYS = 28;
export const SHARE_WINDOW_DAYS = 28;

const CONVERTED_ROLES = new Set(["ATHLETE", "PARENT"]);

export interface Compared<T> {
  current: T;
  previous: T;
}

export interface WeeklyActivityPoint {
  weekEnd: Date;
  rate: number | null;
  activeFamilies: number;
  families: number;
  /** Ultimi sette giorni, calcolati adesso (non ancora salvati dal cron). */
  live: boolean;
}

export interface EngagementSection {
  families: Compared<FamilyActivity | null>;
  weekly: WeeklyActivityPoint[];
  availability: Compared<AvailabilityEngagement>;
  registrations: Compared<RegistrationSource>;
  funnel: Compared<GuestFunnel>;
  notifications: NotificationOpenStat[];
  pushOpenRate: Compared<number | null>;
  shares: ShareVisitSummary;
}

const ago = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS);

/**
 * Famiglie attive nei `windowDays` giorni prima di `now`. La usa anche il
 * cron settimanale, che salva il risultato in `WeeklyActivityStat`: dalle
 * sessioni si sa solo l'ultimo uso, quindi una settimana passata non si
 * ricostruisce dopo.
 */
export async function loadFamilyActivity(
  now: Date,
  windowDays = ACTIVITY_WINDOW_DAYS
): Promise<FamilyActivity & { activeUsers: number }> {
  const [members, children, sessions] = await Promise.all([
    prisma.user.findMany({
      where: { appRole: { in: MEMBER_APP_ROLES } },
      select: { id: true },
    }),
    prisma.child.findMany({
      select: { userId: true, guardians: { select: { userId: true } } },
    }),
    prisma.session.findMany({
      where: { expires: { gt: now } },
      select: { userId: true, expires: true },
    }),
  ]);
  const familyOf = groupFamilies(
    members.map((m) => m.id),
    children
  );
  const active = activeUserIds(sessions, now, windowDays, SESSION_MAX_AGE_SECONDS);
  const activeMembers = [...active].filter((id) => familyOf.has(id)).length;
  return { ...computeFamilyActivity(familyOf, active), activeUsers: activeMembers };
}

/** Salva le famiglie attive della settimana che finisce oggi (cron domenicale). */
export async function saveWeeklyActivitySnapshot(now: Date = new Date()) {
  const a = await loadFamilyActivity(now);
  const weekEnd = romeDay(now);
  const data = {
    families: a.families,
    activeFamilies: a.activeFamilies,
    activeUsers: a.activeUsers,
  };
  await prisma.weeklyActivityStat.upsert({
    where: { weekEnd },
    create: { weekEnd, ...data },
    update: data,
  });
  return data;
}

async function loadWeekly(now: Date) {
  const [live, snapshots] = await Promise.all([
    loadFamilyActivity(now),
    prisma.weeklyActivityStat.findMany({
      where: { weekEnd: { gte: ago(now, (ACTIVITY_HISTORY_WEEKS + 1) * 7) } },
      orderBy: { weekEnd: "asc" },
    }),
  ]);
  const today = romeDay(now).getTime();
  const weekly: WeeklyActivityPoint[] = snapshots
    // La settimana di oggi la dà il calcolo dal vivo.
    .filter((s) => s.weekEnd.getTime() < today)
    .map((s) => ({
      weekEnd: s.weekEnd,
      families: s.families,
      activeFamilies: s.activeFamilies,
      rate: s.families > 0 ? s.activeFamilies / s.families : null,
      live: false,
    }))
    .slice(-(ACTIVITY_HISTORY_WEEKS - 1));
  weekly.push({ weekEnd: romeDay(now), ...live, live: true });

  // Quattro settimane fa: la fotografia salvata più vicina, entro tre giorni.
  const target = ago(now, COMPARE_DAYS).getTime();
  const near = snapshots
    .filter((s) => Math.abs(s.weekEnd.getTime() - target) <= 3.5 * DAY_MS)
    .sort(
      (a, b) => Math.abs(a.weekEnd.getTime() - target) - Math.abs(b.weekEnd.getTime() - target)
    )[0];
  const previous: FamilyActivity | null = near
    ? {
        families: near.families,
        activeFamilies: near.activeFamilies,
        rate: near.families > 0 ? near.activeFamilies / near.families : null,
      }
    : null;
  return { current: live, previous, weekly };
}

async function loadAvailability(now: Date): Promise<Compared<AvailabilityEngagement>> {
  const matches = await prisma.match.findMany({
    where: { date: { gte: ago(now, AVAILABILITY_WINDOW_DAYS + COMPARE_DAYS), lt: now } },
    select: {
      id: true,
      date: true,
      createdAt: true,
      team: {
        select: { isMixed: true, season: true, _count: { select: { memberships: true } } },
      },
      availabilities: { where: { setByStaff: false }, select: { createdAt: true } },
    },
  });
  const [seasonSizes, callupEvents] = await Promise.all([
    loadSeasonRosterSizes(matches.filter((m) => m.team.isMixed).map((m) => m.team.season)),
    matches.length > 0
      ? prisma.auditEvent.findMany({
          where: { action: "UPDATE_CALLUPS", targetId: { in: matches.map((m) => m.id) } },
          select: { targetId: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const firstCallup = new Map<string, Date>();
  for (const e of callupEvents)
    if (!firstCallup.has(e.targetId)) firstCallup.set(e.targetId, e.createdAt);

  const rows = matches.map((m) => ({
    date: m.date,
    createdAt: m.createdAt,
    rosterSize: m.team.isMixed ? (seasonSizes.get(m.team.season) ?? 0) : m.team._count.memberships,
    firstCallupAt: firstCallup.get(m.id) ?? null,
    responses: m.availabilities,
  }));
  const inWindow = (end: Date) => {
    const from = ago(end, AVAILABILITY_WINDOW_DAYS).getTime();
    return rows.filter((r) => r.date.getTime() >= from && r.date.getTime() < end.getTime());
  };
  return {
    current: computeAvailabilityEngagement(inWindow(now)),
    previous: computeAvailabilityEngagement(inWindow(ago(now, COMPARE_DAYS))),
  };
}

async function loadRegistrations(now: Date): Promise<Compared<RegistrationSource>> {
  const sessions = await prisma.trainingSession.findMany({
    where: { date: { gte: ago(now, REGISTRATION_WINDOW_DAYS + COMPARE_DAYS), lt: now } },
    select: {
      date: true,
      registrations: { where: { registeredAsCoach: false }, select: { id: true } },
    },
  });
  const ids = sessions.flatMap((s) => s.registrations.map((r) => r.id));
  const staffAdded =
    ids.length > 0
      ? await prisma.auditEvent.findMany({
          where: { action: "ADD_REGISTRATION", targetId: { in: ids } },
          select: { targetId: true },
        })
      : [];
  const staffIds = new Set(staffAdded.map((e) => e.targetId));
  const split = ago(now, REGISTRATION_WINDOW_DAYS).getTime();
  const pick = (current: boolean) =>
    sessions
      .filter((s) => s.date.getTime() >= split === current)
      .flatMap((s) => s.registrations.map((r) => r.id));
  return {
    current: computeRegistrationSource(pick(true), staffIds),
    previous: computeRegistrationSource(pick(false), staffIds),
  };
}

function roleOf(json: unknown): string | null {
  if (json && typeof json === "object" && "appRole" in json) {
    const v = (json as { appRole: unknown }).appRole;
    return typeof v === "string" ? v : null;
  }
  return null;
}

async function loadFunnel(now: Date): Promise<Compared<GuestFunnel>> {
  const users = await prisma.user.findMany({
    where: { createdAt: { gte: ago(now, FUNNEL_WINDOW_DAYS + COMPARE_DAYS) } },
    select: { id: true, createdAt: true, appRole: true },
  });
  const ids = users.map((u) => u.id);
  const [roleEvents, registrations] =
    ids.length > 0
      ? await Promise.all([
          prisma.auditEvent.findMany({
            where: { action: "UPDATE_ROLE", targetType: "User", targetId: { in: ids } },
            select: { targetId: true, before: true, after: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          }),
          prisma.registration.findMany({
            where: {
              registeredAsCoach: false,
              OR: [
                { userId: { in: ids } },
                { child: { guardians: { some: { userId: { in: ids } } } } },
              ],
            },
            select: {
              createdAt: true,
              userId: true,
              child: { select: { guardians: { select: { userId: true } } } },
            },
          }),
        ])
      : [[], []];

  const wasGuest = new Set(users.filter((u) => u.appRole === "GUEST").map((u) => u.id));
  const convertedAt = new Map<string, Date>();
  for (const e of roleEvents) {
    if (roleOf(e.before) !== "GUEST") continue;
    wasGuest.add(e.targetId);
    const to = roleOf(e.after);
    if (to && CONVERTED_ROLES.has(to) && !convertedAt.has(e.targetId)) {
      convertedAt.set(e.targetId, e.createdAt);
    }
  }
  const firstTraining = new Map<string, Date>();
  const note = (id: string, at: Date) => {
    const prev = firstTraining.get(id);
    if (!prev || at < prev) firstTraining.set(id, at);
  };
  for (const r of registrations) {
    if (r.userId) note(r.userId, r.createdAt);
    for (const g of r.child?.guardians ?? []) note(g.userId, r.createdAt);
  }

  // Gli account creati dallo staff già come atleti o genitori non sono
  // contatti: non sono mai stati ospiti.
  const rows = users
    .filter((u) => wasGuest.has(u.id))
    .map((u) => ({
      createdAt: u.createdAt,
      firstTrainingAt: firstTraining.get(u.id) ?? null,
      convertedAt: convertedAt.get(u.id) ?? null,
    }));
  return {
    current: computeGuestFunnel(rows, now, FUNNEL_WINDOW_DAYS),
    previous: computeGuestFunnel(rows, ago(now, COMPARE_DAYS), FUNNEL_WINDOW_DAYS),
  };
}

async function loadNotifications(now: Date) {
  const since = ago(now, NOTIFICATION_WINDOW_DAYS);
  const prevSince = ago(now, NOTIFICATION_WINDOW_DAYS + COMPARE_DAYS);
  const [push, inApp, inAppRead] = await Promise.all([
    prisma.pushDailyStat.findMany({
      where: { day: { gte: romeDay(prevSince) } },
      select: { day: true, type: true, sent: true, opened: true },
    }),
    prisma.appNotification.groupBy({
      by: ["type"],
      where: { createdAt: { gte: since }, targetUserId: { not: null } },
      _count: { _all: true },
    }),
    prisma.appNotification.groupBy({
      by: ["type"],
      where: { createdAt: { gte: since }, targetUserId: { not: null }, reads: { some: {} } },
      _count: { _all: true },
    }),
  ]);

  const split = romeDay(since).getTime();
  const rows = new Map<string, NotificationOpenRow>();
  const row = (type: string) => {
    let r = rows.get(type);
    if (!r) {
      r = { type, pushSent: 0, pushOpened: 0, inAppSent: 0, inAppRead: 0 };
      rows.set(type, r);
    }
    return r;
  };
  const previous: NotificationOpenRow[] = [];
  for (const p of push) {
    if (p.day.getTime() >= split) {
      const r = row(p.type);
      r.pushSent += p.sent;
      r.pushOpened += p.opened;
    } else {
      previous.push({
        type: p.type,
        pushSent: p.sent,
        pushOpened: p.opened,
        inAppSent: 0,
        inAppRead: 0,
      });
    }
  }
  for (const n of inApp) row(n.type).inAppSent = n._count._all;
  for (const n of inAppRead) row(n.type).inAppRead = n._count._all;

  const current = [...rows.values()];
  return {
    notifications: computeNotificationOpens(current),
    pushOpenRate: {
      current: overallPushOpenRate(current),
      previous: overallPushOpenRate(previous),
    },
  };
}

/** Visite arrivate da un bottone "Condividi" (UX-56), con il periodo prima. */
async function loadShareVisits(now: Date): Promise<ShareVisitSummary> {
  const since = ago(now, SHARE_WINDOW_DAYS);
  const rows = await prisma.shareVisitStat.findMany({
    where: { day: { gte: romeDay(ago(now, SHARE_WINDOW_DAYS + COMPARE_DAYS)) } },
    select: { day: true, campaign: true, source: true, visits: true },
  });
  return summarizeShareVisits(rows, romeDay(since));
}

export async function loadEngagementMetrics(now: Date = new Date()): Promise<EngagementSection> {
  const [weekly, availability, registrations, funnel, notifications, shares] = await Promise.all([
    loadWeekly(now),
    loadAvailability(now),
    loadRegistrations(now),
    loadFunnel(now),
    loadNotifications(now),
    loadShareVisits(now),
  ]);
  return {
    families: { current: weekly.current, previous: weekly.previous },
    weekly: weekly.weekly,
    availability,
    registrations,
    funnel,
    ...notifications,
    shares,
  };
}
