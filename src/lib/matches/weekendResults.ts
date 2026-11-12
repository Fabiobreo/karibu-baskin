import { addDays, getDay, startOfDay } from "date-fns";
import { tz } from "@date-fns/tz";

const ROME = tz("Europe/Rome");

/** Giorni dal venerdì: venerdì 0 … martedì 4. Mercoledì e giovedì non sono nella finestra. */
const DAYS_FROM_FRIDAY: Partial<Record<number, number>> = { 5: 0, 6: 1, 0: 2, 1: 3, 2: 4 };

/**
 * Finestra dei "risultati del fine settimana" in home (UX-58).
 *
 * Il fine settimana va dal venerdì alla domenica (a Roma). I risultati restano
 * in cima alla sezione partite dal venerdì fino al martedì alle 23:59, poi la
 * home torna com'era: chi apre l'app il lunedì trova la cosa di cui si parla.
 *
 * Restituisce l'intervallo `[from, to)` delle date delle partite da mostrare
 * (venerdì 00:00 – lunedì 00:00), o `null` se oggi non siamo nella finestra.
 */
export function weekendResultsWindow(now: Date): { from: Date; to: Date } | null {
  const offset = DAYS_FROM_FRIDAY[getDay(now, { in: ROME })];
  if (offset === undefined) return null;
  const friday = addDays(startOfDay(now, { in: ROME }), -offset, { in: ROME });
  const monday = addDays(friday, 3, { in: ROME });
  return { from: new Date(friday.getTime()), to: new Date(monday.getTime()) };
}
