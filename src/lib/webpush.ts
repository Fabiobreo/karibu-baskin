import webpush from "web-push";
import { prisma } from "./db";
import { mergePrefs, type ControllableNotifType } from "./notifPrefs";

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL ?? "admin@karibubaskin.it"}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  type?: string;
}

function buildData(payload: PushPayload): string {
  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
    icon: payload.icon ?? "/logo.png",
    type: payload.type ?? "",
  });
}

async function cleanupExpired(expired: string[]) {
  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: expired } } });
  }
}

async function dispatchToSubs(
  subs: { endpoint: string; p256dh: string; auth: string }[],
  data: string,
) {
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        data,
      )
    )
  );

  const expired: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const err = r.reason as { statusCode?: number };
      if (err?.statusCode === 410 || err?.statusCode === 404) expired.push(subs[i].endpoint);
    }
  });

  await cleanupExpired(expired);
  const sent = results.filter((r) => r.status === "fulfilled").length;
  return { sent, removed: expired.length };
}

/**
 * Invia a tutti i subscriber (o solo agli admin se adminOnly=true).
 * Se notifType è specificato, rispetta le preferenze push dell'utente per quel tipo.
 */
export async function sendPushToAll(
  payload: PushPayload,
  adminOnly = false,
  notifType?: ControllableNotifType,
) {
  const subs = await prisma.pushSubscription.findMany({
    include: { user: { select: { appRole: true, notifPrefs: true } } },
  });

  let targets = adminOnly
    ? subs.filter((s) => s.user?.appRole === "ADMIN")
    : subs;

  if (notifType) {
    targets = targets.filter((s) => {
      if (!s.userId) return true; // subscription anonima: sempre inviata
      const prefs = mergePrefs(s.user?.notifPrefs);
      return prefs.push[notifType];
    });
  }

  return dispatchToSubs(targets, buildData(payload));
}

/**
 * Invia push a una lista specifica di userId, rispettando le loro preferenze per notifType.
 * Usato per notifiche targettizzate (es. TEAMS_READY → solo iscritti all'allenamento).
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
  notifType?: ControllableNotifType,
) {
  if (userIds.length === 0) return { sent: 0, removed: 0 };

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    include: { user: { select: { notifPrefs: true } } },
  });

  const targets = notifType
    ? subs.filter((s) => {
        const prefs = mergePrefs(s.user?.notifPrefs);
        return prefs.push[notifType];
      })
    : subs;

  return dispatchToSubs(targets, buildData(payload));
}

/**
 * Invia push ai membri di una squadra agonistica e ai genitori dei figli in squadra.
 * Combina userId diretti + parentId dei Child + userId collegati ai Child.
 *
 * Se sportRole è fornito, filtra solo i membri con quel ruolo.
 * Se sportRoles (array) è fornito, filtra per uno qualsiasi dei ruoli nell'array.
 */
export async function sendPushToFilter(
  filter: { teamId?: string | null; sportRole?: number | null; sportRoles?: number[] },
  payload: PushPayload,
  notifType?: ControllableNotifType,
) {
  const { teamId } = filter;
  const roleFilter = filter.sportRoles?.length ? filter.sportRoles : filter.sportRole != null ? [filter.sportRole] : null;

  if (!teamId && !roleFilter) {
    return sendPushToAll(payload, false, notifType);
  }

  const userIds = new Set<string>();

  if (teamId) {
    const memberships = await prisma.teamMembership.findMany({
      where: { teamId },
      select: { userId: true, childId: true },
    });

    const directUserIds = memberships.filter((m) => m.userId).map((m) => m.userId!);
    const childIds = memberships.filter((m) => m.childId).map((m) => m.childId!);

    const userWhere = roleFilter
      ? { id: { in: directUserIds }, sportRole: { in: roleFilter } }
      : { id: { in: directUserIds } };
    const users = directUserIds.length > 0
      ? await prisma.user.findMany({ where: userWhere, select: { id: true } })
      : [];
    for (const u of users) userIds.add(u.id);

    if (childIds.length > 0) {
      const childWhere = roleFilter
        ? { id: { in: childIds }, sportRole: { in: roleFilter } }
        : { id: { in: childIds } };
      const children = await prisma.child.findMany({ where: childWhere, select: { parentId: true, userId: true } });
      for (const c of children) {
        userIds.add(c.parentId);
        if (c.userId) userIds.add(c.userId);
      }
    }
  } else if (roleFilter) {
    const users = await prisma.user.findMany({
      where: { sportRole: { in: roleFilter } },
      select: { id: true },
    });
    for (const u of users) userIds.add(u.id);

    const children = await prisma.child.findMany({
      where: { sportRole: { in: roleFilter } },
      select: { parentId: true, userId: true },
    });
    for (const c of children) {
      userIds.add(c.parentId);
      if (c.userId) userIds.add(c.userId);
    }
  }

  return sendPushToUsers([...userIds], payload, notifType);
}

export async function sendPushToTeam(teamId: string, payload: PushPayload, notifType?: ControllableNotifType) {
  return sendPushToFilter({ teamId }, payload, notifType);
}

export async function sendPushToRole(sportRole: number, payload: PushPayload, notifType?: ControllableNotifType) {
  return sendPushToFilter({ sportRole }, payload, notifType);
}

/**
 * Invia le notifiche push a un singolo utente tramite le sue subscription.
 * Se notifType è specificato, rispetta le preferenze push dell'utente per quel tipo.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  notifType?: ControllableNotifType,
) {
  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    include: notifType ? { user: { select: { notifPrefs: true } } } : undefined,
  });
  if (subs.length === 0) return { sent: 0, removed: 0 };

  const targets = notifType
    ? subs.filter((s) => {
        const prefs = mergePrefs((s as { user?: { notifPrefs: unknown } }).user?.notifPrefs);
        return prefs.push[notifType];
      })
    : subs;

  return dispatchToSubs(targets, buildData(payload));
}
