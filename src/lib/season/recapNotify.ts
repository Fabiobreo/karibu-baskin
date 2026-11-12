import { prisma } from "@/lib/db";
import { MEMBER_APP_ROLES } from "@/lib/authRoles";
import { firstNameOf } from "@/lib/rating/badgeShare";
import { sendPushToUsers } from "@/lib/notifications/webpush";
import { createTargetedAppNotifications } from "@/lib/notifications/appNotifications";
import { loadSeasonParticipants } from "@/lib/season/loadSeasonRecap";
import { recapPath } from "@/lib/season/recapPaths";

/**
 * Avviso "La tua stagione è pronta" (UX-60): parte una volta, quando l'admin
 * pubblica i riepiloghi con la spunta "Avvisa" accesa. Arriva solo a chi ha
 * dei dati nella stagione (presenze o partite) e ai genitori della sua scheda,
 * e solo ai tesserati: un ospite con una presenza non riceve niente.
 */

export const RECAP_NOTIFY_BODY = "Allenamenti, partite e traguardi: guardala e condividila";

export function recapSelfTitle(season: string): string {
  return `🎉 La tua stagione ${season} è pronta`;
}

export function recapGuardianTitle(season: string, firstName: string): string {
  return `🎉 La stagione ${season} di ${firstName} è pronta`;
}

/** Manda gli avvisi e dice a quante persone (account) sono arrivati. */
export async function announceSeasonRecaps(season: string): Promise<number> {
  const people = await loadSeasonParticipants(season);
  const userIds = people.flatMap((p) => (p.userId ? [p.userId] : []));
  const childIds = people.flatMap((p) => (p.childId ? [p.childId] : []));

  const [members, cards] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds }, appRole: { in: MEMBER_APP_ROLES } },
      select: { id: true },
    }),
    // Le schede dei partecipanti, anche quelle dietro un account.
    prisma.child.findMany({
      where: { OR: [{ id: { in: childIds } }, { userId: { in: userIds } }] },
      select: {
        id: true,
        name: true,
        userId: true,
        user: { select: { name: true } },
        guardians: {
          where: { user: { appRole: { in: MEMBER_APP_ROLES } } },
          select: { userId: true },
        },
      },
    }),
  ]);

  const selfIds = members.map((m) => m.id);
  const notified = new Set(selfIds);
  const self = {
    type: "SEASON_RECAP" as const,
    title: recapSelfTitle(season),
    body: RECAP_NOTIFY_BODY,
    url: recapPath(season),
  };
  await Promise.all([
    sendPushToUsers(selfIds, self).catch((err) => console.error("[push stagione]", err)),
    createTargetedAppNotifications(selfIds, self),
  ]);

  // Un avviso per figlio: due fratelli, due avvisi, ognuno con il suo link.
  for (const card of cards) {
    const ids = card.guardians.map((g) => g.userId).filter((id) => id !== card.userId);
    if (ids.length === 0) continue;
    const payload = {
      type: "SEASON_RECAP" as const,
      title: recapGuardianTitle(season, firstNameOf(card.user?.name ?? card.name)),
      body: RECAP_NOTIFY_BODY,
      url: recapPath(season, card.id),
    };
    await Promise.all([
      sendPushToUsers(ids, payload).catch((err) => console.error("[push stagione]", err)),
      createTargetedAppNotifications(ids, payload),
    ]);
    for (const id of ids) notified.add(id);
  }
  return notified.size;
}
