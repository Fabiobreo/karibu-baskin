import { sendPushToAll, sendPushToUsers } from "@/lib/notifications/webpush";
import { loadSessionAudience } from "@/lib/notifications/sessionAudience";
import { hasRestrictions } from "@/lib/registrationRestrictions";
import {
  createAppNotification,
  createTargetedAppNotifications,
} from "@/lib/notifications/appNotifications";
import { formatRomeDayLabel, formatRomeTime } from "@/lib/dateUtils";

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
          : "Nuovo allenamento",
    body,
    url,
  };

  const restrictions = {
    allowedRoles: session.allowedRoles,
    restrictTeamId: session.restrictTeamId,
    openRoles: session.openRoles,
  };

  if (!hasRestrictions(restrictions)) {
    sendPushToAll(pushPayload, false, "NEW_TRAINING").catch((err) =>
      console.error("[push] session open", err)
    );
    createAppNotification(appNotification).catch((err) =>
      console.error("[notification] session open", err)
    );
    return;
  }

  // Allenamento riservato: l'avviso (push e in-app, alle stesse persone) va a
  // chi può davvero iscriversi, con le regole di checkRegistrationAllowed:
  // ruoli ammessi, squadra, ruoli sempre aperti (openRoles).
  loadSessionAudience(restrictions)
    .then((userIds) => {
      const ids = userIds ?? [];
      sendPushToUsers(ids, pushPayload, "NEW_TRAINING").catch((err) =>
        console.error("[push] session open (filtered)", err)
      );
      return createTargetedAppNotifications(ids, appNotification);
    })
    .catch((err) => console.error("[notification] session open (filtered)", err));
}
