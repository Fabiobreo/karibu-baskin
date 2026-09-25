/**
 * Interruttore di sviluppo per le notifiche (UX-26).
 *
 * Con `DISABLE_NOTIFICATIONS=true` push e notifiche in-app non partono: serve a
 * provare nel browser i flussi che avvisano gli utenti (creazione di un
 * allenamento, apertura iscrizioni, squadre pronte) senza avvisare nessuno.
 *
 * Doppio cancello come `/api/test-login`: la variabile *e* un ambiente non di
 * produzione. Una variabile finita per errore in un environment Vercel non
 * spegne le notifiche vere.
 */
export function notificationsDisabled(): boolean {
  return process.env.DISABLE_NOTIFICATIONS === "true" && process.env.NODE_ENV !== "production";
}

/** Traccia in console cosa non è partito, così la prova resta verificabile. */
export function logSkippedNotification(kind: string, detail: string): void {
  console.info(`[notifiche spente] ${kind} non inviata: ${detail}`);
}
