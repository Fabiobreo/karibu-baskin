import { prisma } from "@/lib/db";
import { getBadgeById } from "@/lib/rating/badges";
import { sendPushToUsers } from "@/lib/notifications/webpush";
import { createTargetedAppNotifications } from "@/lib/notifications/appNotifications";

/**
 * Avviso delle statistiche di partita (UX-58): uno solo per persona, con i
 * punti e i traguardi sbloccati nello stesso salvataggio, al posto di
 * "Statistiche disponibili" più un avviso a parte per ogni traguardo.
 *
 * Il tipo resta `MATCH_RESULT`: è la stessa preferenza "Risultati partite" e
 * le aperture si confrontano con quelle di prima (UX-55).
 */

/** Un giocatore da avvisare, già risolto nei suoi destinatari. */
export interface StatsNoticePlayer {
  name: string;
  points: number;
  /** Id dei traguardi sbloccati con questo salvataggio. */
  badgeIds: string[];
  /** Il suo account, se ne ha uno: legge "Hai segnato…". */
  selfId: string | null;
  /** I suoi genitori: leggono "Marco ha segnato…". */
  guardianIds: string[];
}

export interface StatsNotice {
  userIds: string[];
  title: string;
  body: string;
}

function badgeText(ids: string[]): string | null {
  const badges = ids.map(getBadgeById).filter((b) => !!b);
  if (badges.length === 0) return null;
  return badges.map((b) => `${b.label} ${b.emoji}`).join(", ");
}

/** "6 punti", "1 punto". */
const pointsText = (n: number) => `${n} ${n === 1 ? "punto" : "punti"}`;

function headline(p: StatsNoticePlayer, self: boolean, opponent: string): string {
  if (p.points > 0) {
    return self
      ? `Hai segnato ${pointsText(p.points)} contro ${opponent}`
      : `${p.name} ha segnato ${pointsText(p.points)} contro ${opponent}`;
  }
  // Mai "0 punti": ha giocato, ed è questo che conta.
  return self ? `Hai giocato contro ${opponent}` : `${p.name} ha giocato contro ${opponent}`;
}

/**
 * Testi per destinatario. Chi ha più giocatori nella stessa partita (due figli,
 * o sé stesso e un figlio) riceve un avviso solo che li nomina tutti.
 */
export function buildStatsNotices(players: StatsNoticePlayer[], opponent: string): StatsNotice[] {
  const byRecipient = new Map<string, { player: StatsNoticePlayer; self: boolean }[]>();
  const add = (userId: string, player: StatsNoticePlayer, self: boolean) => {
    const list = byRecipient.get(userId) ?? [];
    if (!list.some((e) => e.player === player)) list.push({ player, self });
    byRecipient.set(userId, list);
  };
  for (const p of players) {
    if (p.selfId) add(p.selfId, p, true);
    for (const g of p.guardianIds) if (g !== p.selfId) add(g, p, false);
  }

  // Destinatari con lo stesso testo in un invio solo.
  const notices = new Map<string, StatsNotice>();
  for (const [userId, entries] of byRecipient) {
    let title: string;
    let body: string;
    if (entries.length === 1) {
      const { player, self } = entries[0];
      title = headline(player, self, opponent);
      const badges = badgeText(player.badgeIds);
      body = badges
        ? `${player.badgeIds.length === 1 ? "Un traguardo nuovo" : "Traguardi nuovi"}: ${badges}`
        : "Le statistiche della partita sono online.";
    } else {
      title = `${entries
        .map(({ player, self }) => `${self ? "Tu" : player.name} ${pointsText(player.points)}`)
        .join(", ")} contro ${opponent}`;
      const badges = entries
        .map(({ player, self }) => {
          const text = badgeText(player.badgeIds);
          return text ? `${self ? "per te" : `per ${player.name}`}: ${text}` : null;
        })
        .filter((x) => x !== null);
      body =
        badges.length > 0
          ? `Traguardi nuovi ${badges.join("; ")}`
          : "Le statistiche della partita sono online.";
    }
    const key = `${title}\n${body}`;
    const notice = notices.get(key) ?? { userIds: [], title, body };
    notice.userIds.push(userId);
    notices.set(key, notice);
  }
  return [...notices.values()];
}

/** Un giocatore salvato nelle statistiche, prima di risolvere nomi e destinatari. */
export interface SavedStatPlayer {
  userId?: string | null;
  childId?: string | null;
  points: number;
  badgeIds: string[];
}

/**
 * Risolve nomi e destinatari (account e genitori: un account con una scheda
 * figlio collegata è la stessa persona, @/lib/person) e manda gli avvisi.
 */
export async function notifyMatchStats(
  players: SavedStatPlayer[],
  match: { opponentName: string; url: string }
): Promise<void> {
  if (players.length === 0) return;
  const userIds = players.flatMap((p) => (p.userId ? [p.userId] : []));
  const childIds = players.flatMap((p) => (!p.userId && p.childId ? [p.childId] : []));
  const [users, children] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            childAccount: { select: { guardians: { select: { userId: true } } } },
          },
        })
      : [],
    childIds.length > 0
      ? prisma.child.findMany({
          where: { id: { in: childIds } },
          select: { id: true, name: true, userId: true, guardians: { select: { userId: true } } },
        })
      : [],
  ]);
  const resolved: StatsNoticePlayer[] = players.flatMap((p): StatsNoticePlayer[] => {
    if (p.userId) {
      const u = users.find((x) => x.id === p.userId);
      if (!u) return [];
      return [
        {
          name: u.name ?? "",
          points: p.points,
          badgeIds: p.badgeIds,
          selfId: u.id,
          guardianIds: u.childAccount?.guardians.map((g) => g.userId) ?? [],
        },
      ];
    }
    const c = children.find((x) => x.id === p.childId);
    if (!c) return [];
    return [
      {
        name: c.name,
        points: p.points,
        badgeIds: p.badgeIds,
        selfId: c.userId,
        guardianIds: c.guardians.map((g) => g.userId),
      },
    ];
  });

  const notices = buildStatsNotices(resolved, match.opponentName);
  await Promise.all(
    notices.flatMap((n) => [
      sendPushToUsers(
        n.userIds,
        { title: n.title, body: n.body, url: match.url, type: "MATCH_RESULT" },
        "MATCH_RESULT"
      ).catch((err) => console.error("[push match stats]", err)),
      createTargetedAppNotifications(n.userIds, {
        title: n.title,
        body: n.body,
        url: match.url,
        type: "MATCH_RESULT",
      }).catch((err) => console.error("[notification match stats]", err)),
    ])
  );
}
