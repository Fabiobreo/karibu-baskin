import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/dbRetry";
import { eventStatus, isEventPast, type EventStatus } from "@/lib/events";
import { loadFamily } from "@/lib/eventFamily";
import { loadFamilyAnswerStates, type FamilyAnswerState } from "@/lib/eventRsvp";

/** Gli eventi della home: quelli che cominciano entro un mese, al massimo due. */
export const HOME_EVENTS_DAYS_AHEAD = 30;
export const HOME_EVENTS_MAX = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface HomeEvent {
  id: string;
  slug: string | null;
  title: string;
  date: Date;
  endDate: Date | null;
  location: string | null;
  imageUrl: string | null;
  status: EventStatus;
  /** Risposte della famiglia di chi guarda; null senza accesso. */
  answer: FamilyAnswerState | null;
}

type EventRow = Omit<HomeEvent, "status" | "answer">;

/** Parte pura: toglie i conclusi e tiene i primi, gia' in ordine di data. */
export function pickHomeEvents<T extends { date: Date; endDate: Date | null }>(
  rows: T[],
  now: Date
): T[] {
  return rows.filter((e) => !isEventPast(e, now.getTime())).slice(0, HOME_EVENTS_MAX);
}

export async function loadHomeEvents(userId: string | null): Promise<HomeEvent[]> {
  const now = new Date();
  const limit = new Date(now.getTime() + HOME_EVENTS_DAYS_AHEAD * DAY_MS);
  // Un evento a giornata intera comincia a mezzanotte e dura fino a sera: si
  // parte da ieri e i conclusi li toglie `isEventPast`.
  const since = new Date(now.getTime() - DAY_MS);

  const [rows, family] = await Promise.all([
    withDbRetry(() =>
      prisma.event.findMany({
        where: {
          date: { lte: limit },
          OR: [{ date: { gte: since } }, { endDate: { gte: since } }],
        },
        orderBy: { date: "asc" },
        take: HOME_EVENTS_MAX + 6,
        select: {
          id: true,
          slug: true,
          title: true,
          date: true,
          endDate: true,
          location: true,
          imageUrl: true,
        },
      })
    ),
    userId ? loadFamily(userId) : [],
  ]);

  const events: EventRow[] = pickHomeEvents(rows, now);
  const answers = await loadFamilyAnswerStates(
    events.map((e) => e.id),
    family
  );

  return events.map((e) => ({
    ...e,
    status: eventStatus(e, now),
    answer: userId ? (answers.get(e.id) ?? "none") : null,
  }));
}
