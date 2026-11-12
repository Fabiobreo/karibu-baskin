/**
 * Pagina di "La tua stagione" (UX-60): la propria, o quella di un figlio
 * (`?per=<scheda figlio>`). Senza dipendenze dal server: la usano anche le card client.
 */
export function recapPath(season: string, childId?: string | null): string {
  return `/profilo/stagione/${season}${childId ? `?per=${childId}` : ""}`;
}
