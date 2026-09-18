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
