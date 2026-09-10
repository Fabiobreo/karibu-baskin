/**
 * Svuotamento delle cache del service worker al logout.
 *
 * Il service worker tiene in cache le pagine HTML per l'offline. Le aree
 * riservate sono escluse a monte (vedi `PRIVATE_PATH_PREFIXES` in
 * `public/sw.js`), ma restano in cache le pagine pubbliche e le risposte API,
 * che su un account loggato possono essere personalizzate. Uscire deve lasciare
 * il dispositivo pulito, non solo invalidare il cookie di sessione.
 *
 * Va chiamata **prima** di `signOut`, e non deve mai bloccare il logout: se il
 * worker non risponde entro il timeout si procede comunque, perché restare
 * loggati sarebbe peggio del residuo in cache.
 */
const PURGE_TIMEOUT_MS = 1500;

export async function purgeServiceWorkerCaches(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  const worker = navigator.serviceWorker.controller;
  if (!worker) {
    // Nessun worker attivo: le cache possono comunque esistere da una sessione
    // precedente, quindi le rimuoviamo direttamente dalla pagina.
    await deleteCachesDirectly();
    return;
  }

  await Promise.race([
    new Promise<void>((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      worker.postMessage({ type: "PURGE_SESSION_CACHES" }, [channel.port2]);
    }),
    new Promise<void>((resolve) => setTimeout(resolve, PURGE_TIMEOUT_MS)),
  ]);
}

/** Fallback senza worker: cancella le cache di pagine e API di ogni versione. */
async function deleteCachesDirectly(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.endsWith("-pages") || k.endsWith("-api")).map((k) => caches.delete(k))
    );
  } catch {
    // Storage non accessibile (finestra privata, site data bloccati): il logout
    // prosegue comunque.
  }
}
