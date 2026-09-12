import { Prisma } from "@prisma/client";

/**
 * Errori di *connessione* a Postgres, non di query: il database non è stato
 * raggiunto e nessuna riga di SQL è partita.
 *
 * - P1001 server irraggiungibile (il caso tipico: Neon in scale-to-zero che si
 *   sta risvegliando e supera il connect_timeout)
 * - P1002 server raggiunto ma timeout durante l'handshake
 * - P1008 timeout sull'operazione
 * - P1017 connessione chiusa dal server
 *
 * Solo questi si riprovano: sono transitori per definizione e l'operazione non
 * è mai arrivata al database, quindi ritentare non può duplicare una scrittura.
 */
const TRANSIENT_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

export function isTransientDbError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) {
    // errorCode assente = fallimento in fase di inizializzazione senza codice:
    // è comunque un problema di connessione, non di query.
    return err.errorCode == null || TRANSIENT_CODES.has(err.errorCode);
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_CODES.has(err.code);
  }
  return false;
}

interface RetryOptions {
  /** Tentativi totali, primo incluso. */
  attempts?: number;
  /** Attesa prima del secondo tentativo; raddoppia a ogni giro. */
  delayMs?: number;
}

/**
 * Riprova un'operazione Prisma quando la connessione al database fallisce.
 *
 * Serve al risveglio di Neon: sospeso il compute, la prima connessione dopo un
 * periodo di inattività può superare il connect_timeout e sollevare P1001. Il
 * secondo tentativo trova quasi sempre il database sveglio.
 *
 * Gli errori di query (vincoli, record mancanti, SQL non valida) non vengono
 * mai ritentati: si propagano al primo colpo.
 *
 * Attenzione alla latenza: ogni tentativo aspetta il connect_timeout della
 * connection string. Con due tentativi il caso peggiore è il doppio, quindi il
 * numero di tentativi va tenuto basso nelle richieste che servono una pagina.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  { attempts = 2, delayMs = 250 }: RetryOptions = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (!isTransientDbError(err) || attempt === attempts) throw err;
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  // Irraggiungibile: l'ultimo tentativo esce sempre da return o throw.
  throw lastError;
}
