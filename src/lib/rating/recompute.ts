import { prisma } from "@/lib/db";
import { recomputeRatings } from "./ratingEngine";

/**
 * Chiave del lucchetto Postgres (`pg_try_advisory_xact_lock`) che mette in fila
 * i ricalcoli. Un numero qualsiasi, purché fisso e usato solo qui.
 */
const RECOMPUTE_LOCK = 724_001;

/** Pausa fra un tentativo e l'altro quando un altro ricalcolo è in corso. */
const LOCK_RETRY_MS = 1_000;
/** Dopo questi tentativi si rinuncia: il prossimo salvataggio rifà tutto. */
const LOCK_ATTEMPTS = 45;

/** Il ricalcolo in corso in questa istanza, e se qualcuno ne ha chiesto un altro nel frattempo. */
let running: Promise<void> | null = null;
let again = false;

/** Prova a prendere il lucchetto e, se ci riesce, ricalcola. `false` = occupato. */
async function tryRecompute(): Promise<boolean> {
  return prisma.$transaction(
    async (tx) => {
      const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(${RECOMPUTE_LOCK}::bigint) AS locked`;
      if (!locked) return false;
      await recomputeRatings(tx);
      return true;
    },
    { timeout: 60_000, maxWait: 15_000 }
  );
}

/**
 * Ricalcolo completo dei rating, come lo chiamano le rotte.
 *
 * - **Transazione sua, con un limite largo.** Il ricalcolo riscrive i rating e
 *   lo storico delle curve: deve riuscire tutto o niente, ma non può stare nella
 *   transazione di chi salva il risultato, che ha il limite di 5 secondi di
 *   Prisma. Era il 500 sui risultati delle partitelle.
 * - **In fila, senza tenere connessioni.** Due ricalcoli contemporanei
 *   cancellerebbero e riscriverebbero lo storico insieme, duplicandolo. Chi
 *   trova il lucchetto occupato chiude la sua transazione (restituendo la
 *   connessione) e riprova dopo un secondo: aspettare dentro la transazione
 *   teneva una connessione per ogni ricalcolo in coda.
 * - **Accorpati.** Chiudere un allenamento salva più partitelle di fila: chi
 *   chiede un ricalcolo mentre ce n'è già uno in questa istanza non ne apre un
 *   altro; alla fine se ne fa uno solo in più, che legge tutti i salvataggi
 *   (il replay riparte da capo). Fra istanze diverse vale il lucchetto.
 *
 * Le rotte la lanciano dopo la risposta con `inBackground`.
 */
export function recomputeRatingsSafely(): Promise<void> {
  if (running) {
    // Il ricalcolo in corso può aver già letto i risultati: se ne farà un altro
    // alla fine, uno solo per quanti ne arrivano nel frattempo.
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await recomputeWhenFree();
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Riprova finché il lucchetto non è libero, senza tenere connessioni nell'attesa. */
async function recomputeWhenFree(): Promise<void> {
  for (let attempt = 1; attempt <= LOCK_ATTEMPTS; attempt++) {
    if (await tryRecompute()) return;
    await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
  }
  throw new Error("Ricalcolo dei livelli rinviato: un altro è in corso da troppo");
}
