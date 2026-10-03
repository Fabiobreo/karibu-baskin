/**
 * Primitive di serializzazione iCalendar (RFC 5545) usate dal feed del
 * calendario.
 *
 * Stanno qui e non dentro `route.ts` perche' Next ammette da un route handler
 * solo gli export che riconosce (GET, POST, `dynamic`, ...): esportarle di la'
 * per poterle testare farebbe fallire `next build`, che e' il tipo di rottura
 * che il type check da solo non intercetta.
 */
export function icsDate(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/**
 * Piega una riga a 75 ottetti come vuole RFC 5545, senza spezzare i caratteri.
 *
 * Il limite dell'iCalendar si conta in BYTE, ma il taglio deve cadere fra un
 * carattere e l'altro: tagliando a byte fissi, un accento a cavallo del
 * confine si spacca in due meta' che il decoder sostituisce con U+FFFD (un
 * "mercoledi" lungo al punto giusto perdeva la lettera accentata).
 * Qui si accumula carattere per carattere e si chiude la riga prima di
 * sforare, cosi' il confine non cade mai dentro una sequenza UTF-8.
 *
 * Esportata per i test: e' pura, e provarla dalla route costerebbe una
 * richiesta per ogni lunghezza, mangiandosi il rate limit.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  let first = true;
  // Le righe di continuazione iniziano con uno spazio, che occupa un ottetto.
  const limit = () => (first ? 75 : 74);

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (currentBytes + size > limit()) {
      parts.push((first ? "" : " ") + current);
      first = false;
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += size;
  }
  if (current) parts.push((first ? "" : " ") + current);

  return parts.join("\r\n");
}

/**
 * Numero di sequenza dell'evento.
 *
 * I client che seguono il feed aggiornano un evento gia' sincronizzato solo se
 * vedono un SEQUENCE piu' alto di quello che hanno. Allenamenti e partite non
 * hanno un `updatedAt` a schema, quindi per loro si ricava dall'orario di
 * inizio (minuti dall'epoca): se lo staff sposta l'evento, il numero sale e la
 * modifica arriva. Resta scoperto il caso in cui cambia solo il titolo o il
 * luogo senza toccare la data: li' servirebbe un `updatedAt` sui due modelli.
 */
export function sequenceFor(start: Date, updatedAt?: Date | null): number {
  return Math.floor((updatedAt ?? start).getTime() / 60_000);
}

export const ICS_PRODID = "-//ASD Karibu Baskin//Karibu Baskin App//IT";

/**
 * Un VEVENT. Gli orari sono sempre in UTC (`Z`): nessun VTIMEZONE da
 * dichiarare, e ogni client li porta nel suo fuso.
 */
export function vevent(
  uid: string,
  summary: string,
  dtstart: Date,
  dtend: Date,
  options: {
    description?: string;
    location?: string;
    updatedAt?: Date | null;
  } = {}
): string {
  const { description, location, updatedAt } = options;
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}@karibubaskin.it`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(dtstart)}`,
    `DTEND:${icsDate(dtend)}`,
    `SEQUENCE:${sequenceFor(dtstart, updatedAt)}`,
    foldLine(`SUMMARY:${icsEscape(summary)}`),
  ];
  if (updatedAt) lines.push(`LAST-MODIFIED:${icsDate(updatedAt)}`);
  if (description) lines.push(foldLine(`DESCRIPTION:${icsEscape(description)}`));
  if (location) lines.push(foldLine(`LOCATION:${icsEscape(location)}`));
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

/** Durata convenzionale di una partita nel calendario. */
const MATCH_DURATION_MS = 90 * 60 * 1000;

export interface MatchIcsInput {
  id: string;
  date: Date;
  isHome: boolean;
  teamName: string;
  opponentName: string;
  /** Testo del luogo, da `matchLocation()`; null se da confermare. */
  location: string | null;
}

/**
 * VEVENT di una partita: lo stesso nel feed (`/api/calendar/export.ics`) e nel
 * file della singola partita (`/api/matches/[matchId]/event.ics`). Stesso UID,
 * cosi' chi e' abbonato al feed e importa anche la partita non la vede doppia.
 * Solo squadre, orario e luogo: niente nomi di persone, niente note.
 */
export function matchVevent(m: MatchIcsInput): string {
  const summary = m.isHome
    ? `${m.teamName} vs ${m.opponentName}`
    : `${m.teamName} @ ${m.opponentName}`;
  return vevent(`match-${m.id}`, summary, m.date, new Date(m.date.getTime() + MATCH_DURATION_MS), {
    location: m.location ?? undefined,
  });
}

/** Calendario con un solo impegno, da importare (non e' un feed da seguire). */
export function singleEventCalendar(veventText: string): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${ICS_PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    veventText,
    "END:VCALENDAR",
  ].join("\r\n");
}
