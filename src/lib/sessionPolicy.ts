/**
 * Durata delle sessioni Auth.js (KB-16), condivisa fra la configurazione in
 * `authjs.ts` e le metriche admin, che ricavano l'ultimo utilizzo di una
 * sessione dalla sua scadenza.
 *
 * 90 giorni con rinnovo a scorrimento: quando una sessione viene usata e il
 * rinnovo precedente è più vecchio di `SESSION_UPDATE_AGE_SECONDS`, la scadenza
 * torna a "adesso + 90 giorni". Chi usa l'app resta collegato, un dispositivo
 * abbandonato o perso decade da solo.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
export const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;
