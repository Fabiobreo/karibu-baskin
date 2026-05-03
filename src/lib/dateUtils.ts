/** Formats a Date as "YYYY-MM-DD" using local time. */
export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Formats a Date as "HH:mm" using local time. */
export function toLocalTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 ore di default

/** Restituisce l'orario di fine sessione: endTime se presente, altrimenti start + 2 ore. */
export function sessionEndDate(start: Date, endTime?: Date | null): Date {
  return endTime ?? new Date(start.getTime() + SESSION_DURATION_MS);
}
