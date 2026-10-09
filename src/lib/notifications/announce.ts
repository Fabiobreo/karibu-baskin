import type { AppNotificationType } from "@prisma/client";
import { sendPushToAll } from "@/lib/notifications/webpush";
import {
  createAppNotification,
  removeAppNotifications,
} from "@/lib/notifications/appNotifications";
import { formatRomeDayLabel, formatRomeTime } from "@/lib/dateUtils";
import { RENOTIFY_COOLDOWN_MS } from "@/lib/notifications/renotifyRules";

/**
 * Avvisi a tutti per un evento o un post: il primo ("new") e quello rimandato
 * dallo staff con "Avvisa di nuovo" ("reminder"). Il promemoria ha un titolo
 * diverso, perché chi lo riceve deve capire che non è una novità.
 *
 * Niente nomi di persone in questi testi: `sendPushToAll` raggiunge anche gli
 * ospiti e le iscrizioni push anonime.
 */
export type AnnounceKind = "new" | "reminder";

export const RENOTIFY_TOO_SOON = "Avviso già inviato pochi minuti fa. Riprova più tardi.";

/** Filtro Prisma: mai avvisato, oppure avvisato prima della finestra di attesa. */
export function outsideCooldown(now: Date) {
  return {
    OR: [
      { lastNotifiedAt: null },
      { lastNotifiedAt: { lt: new Date(now.getTime() - RENOTIFY_COOLDOWN_MS) } },
    ],
  };
}

interface Announcement {
  type: AppNotificationType;
  title: string;
  body: string;
  url: string;
}

export function eventAnnouncement(
  event: { id: string; slug: string | null; title: string; date: Date },
  kind: AnnounceKind
): Announcement {
  const url = `/eventi/${event.slug ?? event.id}`;
  if (kind === "new") return { type: "NEW_EVENT", title: "Nuovo evento", body: event.title, url };
  // La data va aggiunta: un evento si rimanda quando si avvicina.
  const when = `${formatRomeDayLabel(event.date)}, ${formatRomeTime(event.date)}`;
  return { type: "NEW_EVENT", title: "Promemoria evento", body: `${event.title} · ${when}`, url };
}

export function postAnnouncement(
  post: { slug: string; title: string; poll: { closesAt: Date | null } | null },
  kind: AnnounceKind,
  now = new Date()
): Announcement {
  const url = `/news/${post.slug}`;
  const type = post.poll ? "NEW_POLL" : "NEW_POST";
  if (kind === "new") {
    return { type, title: post.poll ? "Nuovo sondaggio" : "Nuova news", body: post.title, url };
  }
  const pollOpen = !!post.poll && (!post.poll.closesAt || post.poll.closesAt > now);
  return {
    type,
    title: pollOpen ? "Sondaggio ancora aperto" : "News da leggere",
    body: post.title,
    url,
  };
}

/**
 * Manda push e notifica in-app a tutti. Un promemoria sostituisce in lista
 * l'avviso precedente della stessa cosa, invece di aggiungerne un secondo.
 */
async function announce(
  a: Announcement,
  kind: AnnounceKind,
  pref?: "NEW_POST",
  label = "announce"
): Promise<void> {
  await Promise.all([
    sendPushToAll({ title: a.title, body: a.body, url: a.url, type: a.type }, false, pref).catch(
      (err) => console.error(`[push ${label}]`, err)
    ),
    (kind === "reminder" ? removeAppNotifications(a.type, a.url) : Promise.resolve()).then(() =>
      createAppNotification(a)
    ),
  ]);
}

export function announceEvent(
  event: Parameters<typeof eventAnnouncement>[0],
  kind: AnnounceKind
): Promise<void> {
  return announce(eventAnnouncement(event, kind), kind, undefined, "event");
}

export function announcePost(
  post: Parameters<typeof postAnnouncement>[0],
  kind: AnnounceKind
): Promise<void> {
  return announce(postAnnouncement(post, kind), kind, "NEW_POST", "post");
}
