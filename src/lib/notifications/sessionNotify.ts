import { inBackground } from "@/lib/background";
import { sendPushToAll, sendPushToUsers } from "@/lib/notifications/webpush";
import { loadSessionAudience } from "@/lib/notifications/sessionAudience";
import { hasRestrictions } from "@/lib/registrationRestrictions";
import {
  createAppNotification,
  createTargetedAppNotifications,
} from "@/lib/notifications/appNotifications";
import { formatRomeDayLabel, formatRomeTime } from "@/lib/dateUtils";
import { NEW_TRAINING_TITLE } from "@/lib/notifications/notificationDisplay";

export interface SessionNotifyInput {
  id: string;
  title: string;
  date: Date;
  endTime: Date | null;
  dateSlug: string | null;
  allowedRoles: number[];
  restrictTeamId: string | null;
  openRoles: number[];
}

type NotifKind = "new" | "updated" | "closed";

export function notifySessionOpen(session: SessionNotifyInput, kind: NotifKind = "new") {
  const timeRange = session.endTime
    ? `${formatRomeTime(session.date)}–${formatRomeTime(session.endTime)}`
    : `ore ${formatRomeTime(session.date)}`;
  const dateLabel = formatRomeDayLabel(session.date);
  const body = `${session.title}: ${dateLabel}, ${timeRange}`;
  const url = `/allenamento/${session.dateSlug ?? session.id}`;
  const pushTitle =
    kind === "updated"
      ? "🏀 Allenamento aggiornato"
      : kind === "closed"
        ? "🔒 Iscrizioni chiuse"
        : "🏀 Iscrizioni aperte";
  const pushPayload = { title: pushTitle, body, url, type: "NEW_TRAINING" };

  const appNotification = {
    type: "NEW_TRAINING" as const,
    title:
      kind === "updated"
        ? "Allenamento aggiornato"
        : kind === "closed"
          ? "Iscrizioni chiuse"
          : NEW_TRAINING_TITLE,
    body,
    url,
  };

  const restrictions = {
    allowedRoles: session.allowedRoles,
    restrictTeamId: session.restrictTeamId,
    openRoles: session.openRoles,
  };

  if (!hasRestrictions(restrictions)) {
    inBackground(sendPushToAll(pushPayload, false, "NEW_TRAINING"), "push session open");
    inBackground(createAppNotification(appNotification), "notification session open");
    return;
  }

  // Allenamento riservato: l'avviso (push e in-app, alle stesse persone) va a
  // chi può davvero iscriversi, con le regole di checkRegistrationAllowed:
  // ruoli ammessi, squadra, ruoli sempre aperti (openRoles).
  // Push e in-app partono insieme; la catena finisce solo quando sono finiti
  // entrambi, così `after()` tiene viva la funzione per tutti e due.
  inBackground(
    loadSessionAudience(restrictions).then(async (userIds) => {
      const ids = userIds ?? [];
      await Promise.all([
        sendPushToUsers(ids, pushPayload, "NEW_TRAINING").catch((err) =>
          console.error("[push session open (filtered)]", err)
        ),
        createTargetedAppNotifications(ids, appNotification),
      ]);
    }),
    "notification session open (filtered)"
  );
}
