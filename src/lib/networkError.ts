/**
 * Errori di rete nel browser: una frase sola, ovunque.
 *
 * Senza connessione `fetch` non risponde: rifiuta con un `TypeError` il cui
 * testo lo scrive il browser, in inglese ("Failed to fetch" in Chrome,
 * "NetworkError when attempting to fetch resource." in Firefox, "Load failed"
 * in Safari). Molti moduli mostravano `err.message` così com'era, altri
 * "Errore di rete, riprova", "Errore di rete.", "Connessione assente…": cinque
 * frasi diverse per la stessa cosa. Ora passano tutti da `errorText`.
 *
 * Gli errori del server non c'entrano: arrivano come risposta, e `readError`
 * (`@/lib/fetchJson`) ne fa già un messaggio leggibile.
 */

/**
 * La frase dell'area staff, che è solo in italiano. È la stessa di
 * `common.networkError` nel dizionario italiano (lo controlla il test).
 */
export const NETWORK_ERROR_IT = "Sei senza connessione. Riprova quando torna la rete.";

/** Ripiego dell'area staff per un errore che non è di rete né ha un messaggio. */
export const GENERIC_ERROR_IT = "Qualcosa non ha funzionato. Riprova.";

// Chrome/Edge, Firefox, Safari (vecchio e nuovo, anche WKWebView), React Native.
const FETCH_FAILURE =
  /failed to fetch|networkerror|load failed|network request failed|internet connection appears to be offline|network connection was lost/i;

/** L'errore è la mancanza di rete, non una risposta di errore del server. */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  // Solo i TypeError di `fetch`: un TypeError di codice resta un errore vero.
  return err instanceof TypeError && FETCH_FAILURE.test(err.message);
}

/**
 * Il messaggio da mostrare per un errore preso in un `catch`.
 *
 * - senza rete: `networkText` (nelle pagine pubbliche `tCommon("networkError")`,
 *   nell'area staff la frase italiana di default);
 * - altrimenti il messaggio dell'errore, che di solito viene da `readError`;
 * - se non c'è, `fallback`.
 */
export function errorText(
  err: unknown,
  fallback: string,
  networkText: string = NETWORK_ERROR_IT
): string {
  if (isNetworkError(err)) return networkText;
  return err instanceof Error && err.message ? err.message : fallback;
}
