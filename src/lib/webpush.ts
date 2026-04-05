import webpush from "web-push";
import { prisma } from "./db";

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
}

/**
 * Invia a tutti i subscriber (o solo agli admin se adminOnly=true).
 * Rimuove automaticamente le subscription scadute.
 */
export async function sendPushToAll(payload: PushPayload, adminOnly = false) {
  const subs = await prisma.pushSubscription.findMany({
    include: { user: { select: { appRole: true } } },
  });

  const targets = adminOnly
    ? subs.filter((s) => s.user?.appRole === "ADMIN")
    : subs;

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
    icon: payload.icon ?? "/logo.png",
  });

  const results = await Promise.allSettled(
    targets.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        data
      )
    )
  );

  // Rimuovi subscription non più valide (410 Gone)
  const expired: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const err = r.reason as { statusCode?: number };
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        expired.push(targets[i].endpoint);
      }
    }
  });

  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: expired } },
    });
  }

  return { sent: targets.length - expired.length, removed: expired.length };
}

/**
 * Invia le notifiche push a un singolo utente tramite le sue subscription.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return { sent: 0, removed: 0 };

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
    icon: payload.icon ?? "/logo.png",
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        data
      )
    )
  );

  const expired: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const err = r.reason as { statusCode?: number };
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        expired.push(subs[i].endpoint);
      }
    }
  });

  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: expired } } });
  }

  return { sent: subs.length - expired.length, removed: expired.length };
}
