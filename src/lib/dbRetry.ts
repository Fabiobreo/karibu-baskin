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

/**
 * Connessione chiusa dal server (P1017, "Server has closed the connection"):
 * succede quando Neon si risveglia e le connessioni rimaste nel pool sono tutte
 * morte. Fallisce subito, senza aspettare un timeout, e ogni tentativo può
 * pescare un'altra connessione morta: con le quattro sezioni della home in
 * parallelo due tentativi non bastavano (Sentry, 12/10/2026). Per questo
 * errore i tentativi sono almeno `CLOSED_CONNECTION_ATTEMPTS`.
 */
const CLOSED_CONNECTION_ATTEMPTS = 4;

function isClosedConnection(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P1017";
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
 * Solo per le letture: una connessione chiusa (P1017) può arrivare anche a
 * query già partita, e ritentare una scrittura potrebbe farla due volte.
 *
 * Attenzione alla latenza: ogni tentativo aspetta il connect_timeout della
 * connection string. Con due tentativi il caso peggiore è il doppio, quindi il
 * numero di tentativi va tenuto basso nelle richieste che servono una pagina.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  { attempts = 2, delayMs = 250 }: RetryOptions = {}
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (err) {
      // Chi chiede un solo tentativo lo ottiene, anche qui.
      const limit =
        isClosedConnection(err) && attempts > 1
          ? Math.max(attempts, CLOSED_CONNECTION_ATTEMPTS)
          : attempts;
      if (!isTransientDbError(err) || attempt >= limit) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}
