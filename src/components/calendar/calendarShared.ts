import { startOfDay } from "date-fns";
import type { CalendarEvent } from "@/app/api/calendar/route";

/** Squadra agonistica per la legenda/filtri del calendario. */
export interface TeamInfo {
  id: string;
  name: string;
  season: string;
  color: string | null;
}

export interface DaySegment {
  multiDay: boolean;
  isStart: boolean;
  isEnd: boolean;
  isContinuation: boolean; // giorno successivo all'inizio (durante/fine)
}

/** True se l'evento è visibile dati i filtri attivi (chiavi nascoste). */
export function isVisible(ev: CalendarEvent, hidden: Set<string>): boolean {
  if (ev.type === "training") return !hidden.has("training");
  if (ev.type === "event") return !hidden.has("event");
  if (ev.type === "match") return !hidden.has(`match:${ev.color}`) && !hidden.has("match:*");
  return true;
}

/** Confronta a livello di giorno l'evento con `day` e descrive il segmento. */
export function getDaySegment(ev: CalendarEvent, day: Date): DaySegment {
  const start = startOfDay(new Date(ev.date));
  const end = ev.endDate ? startOfDay(new Date(ev.endDate)) : start;
  const d = startOfDay(day);
  const multiDay = end.getTime() > start.getTime();
  return {
    multiDay,
    isStart: d.getTime() === start.getTime(),
    isEnd: d.getTime() === end.getTime(),
    isContinuation: multiDay && d.getTime() > start.getTime(),
  };
}

/** True se l'evento copre `day` (inizio ≤ day ≤ fine, a livello di giorno). */
export function spansDay(ev: CalendarEvent, day: Date): boolean {
  const start = startOfDay(new Date(ev.date));
  const end = ev.endDate ? startOfDay(new Date(ev.endDate)) : start;
  const d = startOfDay(day);
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}
