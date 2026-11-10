/**
 * Messaggio che il service worker (`public/sw.js`, evento `push`) manda alle
 * pagine aperte quando arriva una notifica, così la campanella si aggiorna
 * subito invece di aspettare il prossimo giro del contatore.
 *
 * Il valore è scritto anche in `sw.js`, che non può importare moduli:
 * `serviceWorker.test.ts` controlla che siano uguali.
 */
export const PUSH_RECEIVED_MESSAGE = "karibu:push-received";
