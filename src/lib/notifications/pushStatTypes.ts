import { AppNotificationType } from "@prisma/client";

/**
 * Tipi contati nelle statistiche delle push (UX-55): quelli delle notifiche
 * più la notifica di prova del profilo. Modulo senza database, così lo
 * leggono anche gli schemi Zod.
 */
export const PUSH_STAT_TYPE = { ...AppNotificationType, TEST: "TEST" } as const;
export type PushStatType = (typeof PUSH_STAT_TYPE)[keyof typeof PUSH_STAT_TYPE];
export const PUSH_STAT_TYPES = Object.values(PUSH_STAT_TYPE) as PushStatType[];

export function isPushStatType(value: unknown): value is PushStatType {
  return typeof value === "string" && (PUSH_STAT_TYPES as string[]).includes(value);
}

const romeDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Il giorno di `date` a Roma, come data a mezzanotte UTC (colonna `@db.Date`). */
export function romeDay(date: Date): Date {
  return new Date(`${romeDate.format(date)}T00:00:00.000Z`);
}
