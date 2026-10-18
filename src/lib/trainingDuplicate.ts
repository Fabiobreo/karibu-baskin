import { CLUB_VENUE_LABEL } from "@/lib/clubVenue";

/**
 * "Duplica allenamento": il modulo di un allenamento nuovo, già compilato come
 * quello di partenza. Gli allenamenti del sabato sono quasi sempre uguali e
 * cambiano solo data e ora (suggerimento del 16/10/2026).
 *
 * Si copiano titolo, orari, luogo e restrizioni; la data proposta è la prima
 * ricorrenza futura dello stesso giorno della settimana, alla stessa ora. Non
 * si copiano iscrizioni, squadre, risultati, apertura delle iscrizioni e avvisi.
 *
 * I conti si fanno sull'ora di Roma, non sugli istanti: una settimana dopo il
 * sabato alle 10 è il sabato dopo alle 10 anche a cavallo del cambio d'ora
 * (sommare 7 × 24 ore la sposterebbe alle 9). E la pagina si disegna anche sul
 * server, che è in UTC: con l'ora di Roma i campi escono uguali nei due posti.
 */

const ZONE = "Europe/Rome";

const PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Data (`yyyy-MM-dd`) e ora (`HH:mm`) di un istante, a Roma. */
export function romeDateTime(instant: Date): { date: string; time: string } {
  const p = Object.fromEntries(PARTS.formatToParts(instant).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** Somma dei giorni a una data di calendario `yyyy-MM-dd`. */
function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export interface DuplicateSource {
  title: string;
  /** ISO o Date dell'inizio. */
  date: string | Date;
  endTime: string | Date | null;
  /** null = sede abituale. */
  location: string | null;
}

/** I campi del modulo "Nuovo allenamento" (stesso formato degli input). */
export interface SessionFormValues {
  title: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
}

export function duplicateFormValues(source: DuplicateSource, now: Date): SessionFormValues {
  const start = romeDateTime(new Date(source.date));
  const today = romeDateTime(now);
  const startsAfterNow = (ymd: string) => `${ymd} ${start.time}` > `${today.date} ${today.time}`;

  // Sempre almeno una settimana dopo quello di partenza, poi la prima futura.
  let date = addDays(start.date, 7);
  while (!startsAfterNow(date)) date = addDays(date, 7);

  return {
    title: source.title,
    date,
    time: start.time,
    endTime: source.endTime ? romeDateTime(new Date(source.endTime)).time : "",
    location: source.location ?? CLUB_VENUE_LABEL,
  };
}
