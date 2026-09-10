/**
 * Percentuale di realizzazione al tiro.
 *
 * I tiri tentati (`shotsAttempted`) sono compilati a mano nel tabellino e in
 * pratica sono spesso incompleti: capita che siano meno dei canestri segnati,
 * e la divisione produceva percentuali tipo 123% o 128%. Un valore sopra il
 * 100% non è un dato impreciso, è un dato palesemente sbagliato: fa dubitare
 * anche delle colonne accanto.
 *
 * Qui la regola sta in un punto solo: se i tentativi mancano o sono meno dei
 * canestri, non c'è percentuale da mostrare. Chi chiama rende `null` come
 * trattino, esattamente come le righe senza dati.
 */
export function shootingAccuracy(made: number, attempted: number): number | null {
  if (!Number.isFinite(made) || !Number.isFinite(attempted)) return null;
  if (attempted <= 0) return null;
  // Dato incompleto: meno tiri registrati che canestri.
  if (attempted < made) return null;
  return Math.round((made / attempted) * 100);
}

/** Come `shootingAccuracy`, ma già formattata per la cella ("64%" oppure "—"). */
export function formatAccuracy(made: number, attempted: number, fallback = "—"): string {
  const pct = shootingAccuracy(made, attempted);
  return pct === null ? fallback : `${pct}%`;
}
