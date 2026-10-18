/**
 * Quando una navigazione deve riportare la pagina in cima.
 *
 * Next lo fa da solo, ma non sulle pagine con un `loading.tsx` (partite,
 * squadre, allenamenti, news, calendario…): lo scheletro di caricamento gli fa
 * perdere il ritorno in cima, e da un link in fondo alla pagina (il footer) la
 * pagina nuova si apriva in fondo. Verificato il 17/10/2026 su 10 link del
 * footer: sbagliavano tutte e sole le 5 pagine con `loading.tsx`.
 *
 * - solo se cambia il percorso: un cambio di parametri (`?stagione=`, i filtri
 *   con `scroll={false}`) resta dov'è;
 * - mai con indietro/avanti: lì il browser rimette la posizione di prima;
 * - mai verso un'ancora (`/contatti#vieni-a-provare`): ci pensa il browser.
 */
export function shouldScrollToTop(input: {
  previousPath: string;
  path: string;
  /**
   * Il percorso dell'ultimo indietro/avanti (`popstate`), o null. Vale solo se
   * è proprio la pagina che si apre: un indietro dentro la stessa pagina
   * (un'ancora, `?stagione=`) non deve far sembrare "da cronologia" il link
   * cliccato dopo.
   */
  poppedPath: string | null;
  hash: string;
}): boolean {
  if (input.previousPath === input.path) return false;
  if (input.poppedPath === input.path) return false;
  return input.hash === "" || input.hash === "#";
}
