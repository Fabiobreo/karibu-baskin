// Helper temporali per gli eventi. Isolano la lettura dell'orologio (`Date.now`)
// fuori dal render dei Server Component, dove la regola react-hooks/purity la
// vieterebbe.

import { endOfDay } from "date-fns";
import { tz } from "@date-fns/tz";
import { formatRome, romeCalendarDaysBetween } from "@/lib/dateUtils";

type TimedEvent = { date: Date; endDate: Date | null };

const ROME = tz("Europe/Rome");

/** Mezzanotte a Roma: un evento creato dal calendario è "a giornata intera". */
export function isAllDay(d: Date): boolean {
  return formatRome(d, "HH:mm") === "00:00";
}

/**
 * Quando finisce davvero un evento. Senza data di fine dura fino a fine
 * giornata (a Roma), e lo stesso vale per una fine a mezzanotte, che è il
 * giorno intero: prima un evento a giornata intera risultava concluso, con le
 * adesioni chiuse, già dalla mezzanotte del suo giorno.
 */
export function eventEnd(e: TimedEvent): Date {
  const end = e.endDate ?? e.date;
  if (!e.endDate || isAllDay(end)) return new Date(endOfDay(end, { in: ROME }).getTime());
  return end;
}

/** Un evento è "passato" quando la sua fine (vedi `eventEnd`) è trascorsa. */
export function isEventPast(e: TimedEvent, now = Date.now()): boolean {
  return eventEnd(e).getTime() <= now;
}

/** Divide gli eventi in prossimi (asc) e passati (desc) rispetto a ora. */
export function splitEventsByTime<T extends TimedEvent>(
  events: T[],
  now = Date.now()
): { upcoming: T[]; past: T[] } {
  const upcoming = events
    .filter((e) => !isEventPast(e, now))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const past = events
    .filter((e) => isEventPast(e, now))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  return { upcoming, past };
}

export type EventStatus =
  | { kind: "live" }
  | { kind: "ended" }
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "daysAway"; days: number };

/** Stato per il chip dell'hero, come per gli allenamenti. Giorni contati a Roma. */
export function eventStatus(e: TimedEvent, now = new Date()): EventStatus {
  if (isEventPast(e, now.getTime())) return { kind: "ended" };
  // Un evento a giornata intera non ha un'ora d'inizio: "Oggi", non "In corso".
  if (e.date <= now && !(isAllDay(e.date) && !e.endDate)) return { kind: "live" };
  const days = romeCalendarDaysBetween(now, e.date);
  if (days <= 0) return { kind: "today" };
  if (days === 1) return { kind: "tomorrow" };
  return { kind: "daysAway", days };
}
