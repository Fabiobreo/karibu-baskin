import { prisma } from "@/lib/db";
import { formatRomeDayLabel } from "@/lib/dateUtils";
import {
  deliverNotices,
  loadPlayerAudiences,
  type OutgoingNotice,
  type PlayerAudience,
} from "@/lib/notifications/matchNotify";
import { playerRecipientIds } from "@/lib/notifications/recipients";
import type { BibKey, TeamChanges } from "@/lib/trainingTeams";

/**
 * Avvisi delle squadre di un allenamento (UX-54).
 *
 * La prima volta che le squadre ci sono, "Squadre pronte!" a tutti quelli in
 * squadra. Dopo, solo a chi entra o cambia squadra, per persona come le
 * convocazioni: il giocatore legge "Sei nei Neri", i genitori "Marco è nei
 * Neri". Chi esce dalle squadre non si avvisa. Un allenamento finito non
 * avvisa nessuno: squadre rifatte dopo non sono una novità.
 */

/** "negli Arancioni", "nei Neri": il nome della casacca con la sua preposizione. */
const IN_TEAM: Record<BibKey, string> = {
  teamA: "negli Arancioni",
  teamB: "nei Neri",
  teamC: "nei Bianchi",
};

export type TeamChangeKind = "added" | "moved";

export interface SessionLabel {
  title: string;
  date: Date;
  url: string;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Testi per una persona entrata o spostata, uno per lei e uno per i genitori. */
export function teamChangeNotices(
  session: SessionLabel,
  players: { audience: PlayerAudience; key: BibKey; kind: TeamChangeKind }[]
): OutgoingNotice[] {
  const when = `per l'allenamento di ${formatRomeDayLabel(session.date)}`;
  const notices: OutgoingNotice[] = [];
  for (const { audience, key, kind } of players) {
    const where = IN_TEAM[key];
    const name = firstName(audience.name);
    if (audience.selfIds.length > 0) {
      notices.push({
        type: "TEAMS_READY",
        ids: audience.selfIds,
        title: "La tua squadra",
        body: `${kind === "moved" ? "Ora sei" : "Sei"} ${where} ${when}.`,
        url: session.url,
      });
    }
    if (audience.guardianIds.length > 0) {
      notices.push({
        type: "TEAMS_READY",
        ids: audience.guardianIds,
        title: `La squadra di ${name}`,
        body: `${name} ${kind === "moved" ? "ora è" : "è"} ${where} ${when}.`,
        url: session.url,
      });
    }
  }
  return notices;
}

interface PlayerRegistration {
  id: string;
  userId: string | null;
  childId: string | null;
}

/**
 * Avvisa chi è toccato da un cambio di squadre. `registrations` sono le
 * iscrizioni dell'allenamento (servono per passare dall'iscrizione alla persona).
 */
export async function notifyTeamChanges(
  sessionId: string,
  changes: TeamChanges,
  registrations: PlayerRegistration[]
): Promise<void> {
  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { title: true, dateSlug: true, date: true, endTime: true },
  });
  if (!session || (session.endTime ?? session.date) < new Date()) return;
  const url = `/allenamento/${session.dateSlug ?? sessionId}`;
  const regById = new Map(registrations.map((r) => [r.id, r]));

  if (changes.initial) {
    // Nell'ordine delle iscrizioni, non delle squadre.
    const inTeams = new Set(changes.added.map((c) => c.id));
    const players = registrations.filter((r) => inTeams.has(r.id));
    const ids = await playerRecipientIds(players);
    if (ids.length === 0) return;
    await deliverNotices(
      [
        {
          type: "TEAMS_READY",
          ids,
          title: "Squadre pronte!",
          body: `Le squadre per "${session.title}" sono state create.`,
          url,
        },
      ],
      "teams ready"
    );
    return;
  }

  // Un gruppo per tipo di cambio e squadra: dentro, le persone si leggono insieme.
  const groups = new Map<
    string,
    { kind: TeamChangeKind; key: BibKey; regs: PlayerRegistration[] }
  >();
  for (const [kind, list] of [
    ["added", changes.added],
    ["moved", changes.moved],
  ] as const) {
    for (const c of list) {
      const reg = regById.get(c.id);
      if (!reg || (!reg.userId && !reg.childId)) continue;
      const groupKey = `${kind}:${c.key}`;
      const group = groups.get(groupKey) ?? { kind, key: c.key, regs: [] };
      group.regs.push(reg);
      groups.set(groupKey, group);
    }
  }
  if (groups.size === 0) return;

  const players = (
    await Promise.all(
      [...groups.values()].map(async (g) =>
        (await loadPlayerAudiences(g.regs)).map((audience) => ({
          audience,
          key: g.key,
          kind: g.kind,
        }))
      )
    )
  ).flat();
  await deliverNotices(
    teamChangeNotices({ title: session.title, date: session.date, url }, players),
    "team changes"
  );
}
