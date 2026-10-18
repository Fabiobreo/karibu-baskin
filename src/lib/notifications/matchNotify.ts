import { prisma } from "@/lib/db";
import { withGuardians } from "@/lib/person";
import { formatRomeDayLabel, formatRomeTime } from "@/lib/dateUtils";
import { sendPushToUsers } from "@/lib/notifications/webpush";
import { createTargetedAppNotifications } from "@/lib/notifications/appNotifications";
import { staffUserIds } from "@/lib/notifications/recipients";
import type { AppNotificationType } from "@prisma/client";

/**
 * Avvisi legati alle convocazioni di una partita.
 *
 * - convocazione e suo ritiro (`MATCH_CALLUP`), al giocatore e ai genitori;
 * - disponibilità segnata dallo staff (`MATCH_AVAILABILITY`), alla famiglia,
 *   che così sa che qualcuno ha risposto al suo posto e può correggere;
 * - un convocato che dice di non esserci (`MATCH_AVAILABILITY`), allo staff.
 *
 * Il giocatore legge "Sei…", i genitori "Marco è…": per questo i testi sono
 * per persona e non uno solo per tutti. Gli avvisi non dipendono dalle
 * preferenze: riguardano la persona direttamente, come i collegamenti fra
 * genitore e figlio. Testi senza genere ("fra i convocati", "disponibile").
 */

export interface PlayerKey {
  userId?: string | null;
  childId?: string | null;
}

export interface MatchLabelInput {
  id: string;
  slug: string | null;
  date: Date;
  teamName: string;
  opponentName: string;
}

/** Una persona da avvisare: il suo account e, separati, i genitori. */
export interface PlayerAudience {
  name: string;
  selfIds: string[];
  guardianIds: string[];
}

export interface OutgoingNotice {
  type: AppNotificationType;
  ids: string[];
  title: string;
  body: string;
  url: string;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function matchWhen(m: MatchLabelInput): string {
  return `${formatRomeDayLabel(m.date)} alle ${formatRomeTime(m.date)}`;
}

export function matchUrl(m: Pick<MatchLabelInput, "id" | "slug">): string {
  return `/partite/${m.slug ?? m.id}`;
}

const CALLUP_TITLE: Record<CallupChange, string> = {
  added: "Convocazione",
  removed: "Convocazione ritirata",
  reminder: "Promemoria convocazione",
};

/**
 * `added`/`removed`: la lista è cambiata al salvataggio. `reminder`: lo staff
 * ha mandato a mano "Avvisa i convocati" a tutta la lista attuale.
 */
export type CallupChange = "added" | "removed" | "reminder";

/** Testi di convocazione, ritiro o promemoria, uno per il giocatore e uno per i genitori. */
export function callupNotices(
  match: MatchLabelInput,
  players: PlayerAudience[],
  change: CallupChange
): OutgoingNotice[] {
  const game = `${match.teamName} vs ${match.opponentName}`;
  const when = matchWhen(match);
  const title = CALLUP_TITLE[change];
  const notices: OutgoingNotice[] = [];
  for (const p of players) {
    const who = firstName(p.name);
    const self =
      change === "removed"
        ? `Non sei più fra i convocati di ${game}, ${when}.`
        : `Sei fra i convocati di ${game}, ${when}.`;
    const guardian =
      change === "removed"
        ? `${who} non è più fra i convocati di ${game}, ${when}.`
        : `${who} è fra i convocati di ${game}, ${when}.`;
    const base = { type: "MATCH_CALLUP" as const, title, url: matchUrl(match) };
    if (p.selfIds.length > 0) notices.push({ ...base, ids: p.selfIds, body: self });
    if (p.guardianIds.length > 0) notices.push({ ...base, ids: p.guardianIds, body: guardian });
  }
  return notices;
}

/** Avviso alla famiglia: lo staff ha segnato la disponibilità al posto suo. */
export function staffAvailabilityNotices(
  match: MatchLabelInput,
  player: PlayerAudience,
  available: boolean
): OutgoingNotice[] {
  const game = `${match.teamName} vs ${match.opponentName}`;
  const when = matchWhen(match);
  const state = available ? "disponibile" : "non disponibile";
  const fix = "Se non è così, cambia la risposta da «Le mie disponibilità».";
  const base = {
    type: "MATCH_AVAILABILITY" as const,
    title: "Disponibilità segnata dallo staff",
    url: "/profilo/disponibilita",
  };
  const notices: OutgoingNotice[] = [];
  if (player.selfIds.length > 0) {
    notices.push({
      ...base,
      ids: player.selfIds,
      body: `Lo staff ti ha segnato ${state} per ${game}, ${when}. ${fix}`,
    });
  }
  if (player.guardianIds.length > 0) {
    notices.push({
      ...base,
      ids: player.guardianIds,
      body: `Lo staff ha segnato ${firstName(player.name)} ${state} per ${game}, ${when}. ${fix}`,
    });
  }
  return notices;
}

/** Avviso allo staff: un convocato ha detto che non c'è. */
export function callupDeclinedNotice(
  match: MatchLabelInput,
  playerName: string,
  staffIds: string[]
): OutgoingNotice | null {
  if (staffIds.length === 0) return null;
  return {
    type: "MATCH_AVAILABILITY",
    ids: staffIds,
    title: "Un convocato non c'è",
    body: `${playerName} ha detto che non c'è per ${match.teamName} vs ${match.opponentName}, ${matchWhen(match)}. Rivedi le convocazioni.`,
    url: `/admin/partite/${match.id}/convocazioni`,
  };
}

/** Push e in-app alle stesse persone; un invio fallito non ferma gli altri. */
export async function deliverNotices(notices: OutgoingNotice[], label: string): Promise<void> {
  await Promise.all(
    notices.flatMap((n) => [
      sendPushToUsers(n.ids, { title: n.title, body: n.body, url: n.url, type: n.type }).catch(
        (err) => console.error(`[push ${label}]`, err)
      ),
      createTargetedAppNotifications(n.ids, {
        type: n.type,
        title: n.title,
        body: n.body,
        url: n.url,
      }).catch((err) => console.error(`[notification ${label}]`, err)),
    ])
  );
}

/** Nome della partita per i testi: squadra, avversaria, data. */
export async function loadMatchLabel(matchId: string): Promise<MatchLabelInput | null> {
  const m = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      slug: true,
      date: true,
      team: { select: { name: true } },
      opponent: { select: { name: true } },
      opponentTeam: { select: { name: true } },
    },
  });
  if (!m) return null;
  return {
    id: m.id,
    slug: m.slug,
    date: m.date,
    teamName: m.team.name,
    opponentName: m.opponent?.name ?? m.opponentTeam?.name ?? "Avversario",
  };
}

/**
 * Chi avvisare per ogni giocatore. Un account: lui, più i genitori della sua
 * scheda. Una scheda figlio: i genitori, più l'account del figlio se ne ha uno.
 * Chi è sia il giocatore sia un genitore (non succede, ma) legge il testo "Sei".
 */
export async function loadPlayerAudiences(players: PlayerKey[]): Promise<PlayerAudience[]> {
  const userIds = [...new Set(players.flatMap((p) => (p.userId ? [p.userId] : [])))];
  const childIds = [
    ...new Set(players.flatMap((p) => (!p.userId && p.childId ? [p.childId] : []))),
  ];
  const [users, children] = await Promise.all([
    userIds.length > 0
      ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [],
    childIds.length > 0
      ? prisma.child.findMany({
          where: { id: { in: childIds } },
          select: { name: true, userId: true, guardians: { select: { userId: true } } },
        })
      : [],
  ]);

  const audiences: PlayerAudience[] = [];
  for (const u of users) {
    const all = await withGuardians([u.id]);
    audiences.push({
      name: u.name ?? "",
      selfIds: [u.id],
      guardianIds: all.filter((id) => id !== u.id),
    });
  }
  for (const c of children) {
    const selfIds = c.userId ? [c.userId] : [];
    const guardianIds = [...new Set(c.guardians.map((g) => g.userId))].filter(
      (id) => !selfIds.includes(id)
    );
    audiences.push({ name: c.name, selfIds, guardianIds });
  }
  return audiences.filter((a) => a.selfIds.length > 0 || a.guardianIds.length > 0);
}

/** Convocazioni cambiate: avvisa chi è entrato e chi è uscito. */
export async function notifyCallupChanges(
  matchId: string,
  added: PlayerKey[],
  removed: PlayerKey[]
): Promise<void> {
  if (added.length === 0 && removed.length === 0) return;
  const match = await loadMatchLabel(matchId);
  if (!match) return;
  const [addedAudience, removedAudience] = await Promise.all([
    loadPlayerAudiences(added),
    loadPlayerAudiences(removed),
  ]);
  await deliverNotices(
    [
      ...callupNotices(match, addedAudience, "added"),
      ...callupNotices(match, removedAudience, "removed"),
    ],
    "match callups"
  );
}

/**
 * "Avvisa i convocati": rimanda l'avviso a tutti i convocati attuali e ai loro
 * genitori, con il titolo "Promemoria convocazione".
 */
export async function notifyAllCallups(matchId: string): Promise<void> {
  const [match, callups] = await Promise.all([
    loadMatchLabel(matchId),
    prisma.matchCallup.findMany({ where: { matchId }, select: { userId: true, childId: true } }),
  ]);
  if (!match || callups.length === 0) return;
  const audiences = await loadPlayerAudiences(callups);
  await deliverNotices(callupNotices(match, audiences, "reminder"), "match callups reminder");
}

/** Lo staff ha segnato la disponibilità: lo dice alla famiglia. */
export async function notifyStaffAvailability(
  matchId: string,
  player: PlayerKey,
  available: boolean
): Promise<void> {
  const [match, audiences] = await Promise.all([
    loadMatchLabel(matchId),
    loadPlayerAudiences([player]),
  ]);
  if (!match || audiences.length === 0) return;
  await deliverNotices(
    staffAvailabilityNotices(match, audiences[0], available),
    "staff availability"
  );
}

/** Un convocato ha detto di no: lo dice allo staff. */
export async function notifyCallupDeclined(matchId: string, playerName: string): Promise<void> {
  const [match, staffIds] = await Promise.all([loadMatchLabel(matchId), staffUserIds()]);
  if (!match) return;
  const notice = callupDeclinedNotice(match, playerName, staffIds);
  if (notice) await deliverNotices([notice], "callup declined");
}
