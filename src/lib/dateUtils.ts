import { differenceInCalendarDays, format, isSameDay, type FormatOptions } from "date-fns";
import { tz } from "@date-fns/tz";

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

// Contesto date-fns v4 per calcolare nel fuso di Roma (`{ in: CLUB_TZ }`).
const CLUB_TZ = tz(CLUB_TIME_ZONE);

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

/**
 * `format()` di date-fns nel fuso di Roma. Da usare in tutto il codice che gira
 * sul server (Server Component, metadata, OG image, API): lì il `format()`
 * semplice darebbe l'ora UTC. Nei Client Component è indifferente, ma usarlo
 * evita anche il mismatch di idratazione fra testo del server e del browser.
 */
export function formatRome(
  d: Date | string | number,
  pattern: string,
  options?: Omit<FormatOptions, "in">
): string {
  return format(d, pattern, { ...options, in: CLUB_TZ });
}

/** Stesso giorno di calendario a Roma (un evento "su più giorni" si decide così). */
export function isSameRomeDay(a: Date | string | number, b: Date | string | number): boolean {
  return isSameDay(a, b, { in: CLUB_TZ });
}

/** Giorni di calendario (a Roma) da `from` a `to`: 0 = stesso giorno, 1 = domani. */
export function romeCalendarDaysBetween(
  from: Date | string | number,
  to: Date | string | number
): number {
  return differenceInCalendarDays(to, from, { in: CLUB_TZ });
}
