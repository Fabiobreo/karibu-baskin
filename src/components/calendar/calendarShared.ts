import { startOfDay } from "date-fns";
import type { CalendarEvent } from "@/app/api/calendar/route";
import { teamFilterKey, typeFilterKey } from "@/lib/calendar/eventColors";

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

/**
 * True se l'evento è visibile dati i filtri attivi (chiavi nascoste).
 *
 * Due assi indipendenti: il tipo (`type:training`) e la squadra (`team:<id>`).
 * La chiave squadra usa l'ID e non il colore: due squadre che hanno scelto lo
 * stesso colore restano due filtri distinti.
 */
export function isVisible(ev: CalendarEvent, hidden: Set<string>): boolean {
  if (hidden.has(typeFilterKey(ev.type))) return false;
  if (ev.teamId && hidden.has(teamFilterKey(ev.teamId))) return false;
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
