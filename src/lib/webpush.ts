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
  return { sent: subs.length - expired.length, removed: expired.length };
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
