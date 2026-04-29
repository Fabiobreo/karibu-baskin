// [CLAUDE - 07:00] Centralizza il calcolo stagione sportiva, rimpiazza 14+ occorrenze duplicate

/**
 * Restituisce la stringa stagione (es. "2025-26") per una data.
 * La stagione inizia a settembre (mese indice 8).
 * Aug 2025 → "2024-25", Sep 2025 → "2025-26"
 */
export function getCurrentSeason(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const s = d.getMonth() >= 8 ? y : y - 1;
  return `${s}-${String(s + 1).slice(-2)}`;
}

/**
 * Restituisce il 1° agosto dell'anno di inizio stagione per una data.
 * Usato per filtrare le sessioni di allenamento (pre-season inizia ad agosto).
 */
export function getSeasonStartDate(date: Date = new Date()): Date {
  const y = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return new Date(y, 7, 1);
}
