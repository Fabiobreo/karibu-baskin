import { TZDate } from "@date-fns/tz";

/**
 * Intervallo richiesto a `GET /api/calendar`, sempre `[from, to)`.
 *
 * La griglia del calendario mostra settimane intere, quindi anche gli ultimi
 * giorni del mese prima e i primi del mese dopo: il client chiede l'intervallo
 * visibile con `from`/`to` (ISO con fuso). `month=YYYY-MM` resta per chi lo
 * usava (e per le risposte già nella cache del service worker).
 */
export interface CalendarRange {
  from: Date;
  to: Date;
}

// Sei settimane di griglia più un margine: oltre è una richiesta anomala.
export const MAX_RANGE_DAYS = 45;

const CLUB_TIME_ZONE = "Europe/Rome";
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/** Mese di calendario a Roma: il server gira in UTC, `new Date(y, m, 1)` sarebbe mezzanotte UTC. */
function romeMonth(year: number, monthIndex: number): CalendarRange {
  return {
    from: new Date(new TZDate(year, monthIndex, 1, CLUB_TIME_ZONE).getTime()),
    to: new Date(new TZDate(year, monthIndex + 1, 1, CLUB_TIME_ZONE).getTime()),
  };
}

function parseIso(value: string | null): Date | null {
  if (!value || !ISO_WITH_OFFSET.test(value)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseCalendarRange(params: URLSearchParams, now = new Date()): CalendarRange {
  const from = parseIso(params.get("from"));
  const to = parseIso(params.get("to"));
  if (from && to) {
    const days = (to.getTime() - from.getTime()) / 86_400_000;
    if (days > 0 && days <= MAX_RANGE_DAYS) return { from, to };
  }

  const month = params.get("month");
  if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    return romeMonth(y, m - 1);
  }

  const today = new TZDate(now.getTime(), CLUB_TIME_ZONE);
  return romeMonth(today.getFullYear(), today.getMonth());
}
