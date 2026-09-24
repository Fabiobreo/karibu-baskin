/**
 * Numero con al massimo `maxDigits` decimali, nel formato della lingua:
 * "17,7" in italiano, "17.7" in inglese. Da usare al posto di `toFixed` per
 * tutto cio' che si legge a schermo (UX-06); `toFixed` resta per le
 * coordinate SVG e simili.
 */
export function formatDecimal(value: number, locale: string, maxDigits = 1): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: maxDigits }).format(value);
}
