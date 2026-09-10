/**
 * Conversioni fra il valore di un `<input type="datetime-local">` e l'ISO 8601.
 *
 * L'input produce e accetta solo `YYYY-MM-DDTHH:mm`, senza secondi e senza
 * fuso: mandarlo a un campo Zod `datetime({ offset: true })` fa fallire la
 * validazione, e rimandare indietro un ISO con la `Z` lascia l'input vuoto.
 * Sono i due versi dello stesso errore, ed erano entrambi presenti nel form
 * dei sondaggi.
 */

/** `"2026-09-14T20:23"` → ISO con offset, interpretando l'ora come locale. */
export function localInputToIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** ISO (o `Date`) → `"YYYY-MM-DDTHH:mm"` nel fuso locale, per l'input. */
export function isoToLocalInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
