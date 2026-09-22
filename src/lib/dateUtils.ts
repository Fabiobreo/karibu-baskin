/** Formats a Date as "YYYY-MM-DD" using local time. */
export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Formats a Date as "HH:mm" using local time. */
export function toLocalTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 ore di default

/** Restituisce l'orario di fine sessione: endTime se presente, altrimenti start + 2 ore. */
export function sessionEndDate(start: Date, endTime?: Date | null): Date {
  return endTime ?? new Date(start.getTime() + SESSION_DURATION_MS);
}

// Il server (Vercel) gira in UTC: `format()` di date-fns e i getter locali di Date
// darebbero l'ora UTC, due ore indietro d'estate. I testi composti sul server
// (notifiche push/in-app, cron) passano da qui, con il fuso della squadra fisso.
const CLUB_TIME_ZONE = "Europe/Rome";

const romeTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  timeZone: CLUB_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const romeDayFormatter = new Intl.DateTimeFormat("it-IT", {
  timeZone: CLUB_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "HH:mm" nel fuso di Roma, indipendente dal fuso del server. */
export function formatRomeTime(d: Date): string {
  return romeTimeFormatter.format(d);
}

/** "martedì 22 settembre" nel fuso di Roma, indipendente dal fuso del server. */
export function formatRomeDayLabel(d: Date): string {
  return romeDayFormatter.format(d);
}
