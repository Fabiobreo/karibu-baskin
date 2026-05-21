import { format } from "date-fns";
import { it } from "date-fns/locale";
import { sendPushToAll, sendPushToTeam, sendPushToFilter } from "@/lib/webpush";
import { createAppNotification } from "@/lib/appNotifications";

export interface SessionNotifyInput {
  id: string;
  title: string;
  date: Date;
  endTime: Date | null;
  dateSlug: string | null;
  allowedRoles: number[];
  restrictTeamId: string | null;
}

type NotifKind = "new" | "updated" | "closed";

export function notifySessionOpen(session: SessionNotifyInput, kind: NotifKind = "new") {
  const timeRange = session.endTime
    ? `${format(session.date, "HH:mm")}–${format(session.endTime, "HH:mm")}`
    : `ore ${format(session.date, "HH:mm")}`;
  const dateLabel = format(session.date, "EEEE d MMMM", { locale: it });
  const body = `${session.title} — ${dateLabel}, ${timeRange}`;
  const url = `/allenamento/${session.dateSlug ?? session.id}`;
  const pushTitle =
    kind === "updated"
      ? "🏀 Allenamento aggiornato"
      : kind === "closed"
        ? "🔒 Iscrizioni chiuse"
        : "🏀 Iscrizioni aperte";
  const pushPayload = { title: pushTitle, body, url, type: "NEW_TRAINING" };

  if (session.restrictTeamId) {
    sendPushToTeam(session.restrictTeamId, pushPayload, "NEW_TRAINING").catch((err) =>
      console.error("[push] session open (team)", err)
    );
  } else if (session.allowedRoles.length > 0) {
    sendPushToFilter({ sportRoles: session.allowedRoles }, pushPayload, "NEW_TRAINING").catch(
      (err) => console.error("[push] session open (roles)", err)
    );
  } else {
    sendPushToAll(pushPayload, false, "NEW_TRAINING").catch((err) =>
      console.error("[push] session open", err)
    );
  }

  createAppNotification({
    type: "NEW_TRAINING",
    title:
      kind === "updated"
        ? "Allenamento aggiornato"
        : kind === "closed"
          ? "Iscrizioni chiuse"
          : "Nuovo allenamento",
    body,
    url,
  }).catch((err) => console.error("[notification] session open", err));
}
