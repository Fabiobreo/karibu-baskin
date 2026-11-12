import { prisma } from "@/lib/db";
import { MEMBER_APP_ROLES } from "@/lib/authRoles";
import { sendPushToUsers } from "@/lib/notifications/webpush";
import {
  createTargetedAppNotifications,
  removeAppNotifications,
} from "@/lib/notifications/appNotifications";
import type { AnnounceKind } from "@/lib/notifications/announce";

/**
 * Avviso "Sono arrivate le foto" (UX-57). Parte solo quando lo staff lo
 * chiede (spunta alla creazione, "Avvisa di nuovo" dal "⋯"), mai da "Aggiorna"
 * né dal cron: le foto aggiunte dopo non mandano un secondo avviso.
 *
 * Arriva ai soli tesserati, anche per un album pubblico: le foto ritraggono
 * persone, e `sendPushToAll` raggiungerebbe anche le iscrizioni push anonime e
 * gli ospiti. I convocati di una partita e chi va a un evento sono tesserati,
 * quindi sono già compresi; la preferenza "Nuove foto" vale per tutti, così
 * chi la spegne non riceve più niente.
 */

export const ALBUM_NOTIFY_TITLE = "Sono arrivate le foto";
export const ALBUM_REMINDER_TITLE = "Hai visto le foto?";

export interface AlbumAnnouncement {
  type: "ALBUM_PUBLISHED";
  title: string;
  body: string;
  url: string;
}

export function albumAnnouncement(
  album: { slug: string; title: string; photoCount: number },
  kind: AnnounceKind
): AlbumAnnouncement {
  return {
    type: "ALBUM_PUBLISHED",
    title: kind === "new" ? ALBUM_NOTIFY_TITLE : ALBUM_REMINDER_TITLE,
    body: `${album.title} · ${album.photoCount} foto`,
    url: `/gallery/${album.slug}`,
  };
}

/** Gli account dei tesserati: chi riceve l'avviso. */
export async function albumRecipientIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { appRole: { in: MEMBER_APP_ROLES } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/**
 * Push e in-app alle stesse persone. Un promemoria sostituisce in lista
 * l'avviso precedente dello stesso album.
 */
export async function announceAlbum(
  album: Parameters<typeof albumAnnouncement>[0],
  kind: AnnounceKind
): Promise<void> {
  const a = albumAnnouncement(album, kind);
  const ids = await albumRecipientIds();
  await Promise.all([
    sendPushToUsers(ids, a, "ALBUM_PUBLISHED").catch((err) => console.error("[push album]", err)),
    (kind === "reminder" ? removeAppNotifications(a.type, a.url) : Promise.resolve()).then(() =>
      createTargetedAppNotifications(ids, a)
    ),
  ]);
}
