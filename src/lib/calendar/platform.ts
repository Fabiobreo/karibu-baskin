/**
 * Piattaforma di chi aggiunge il calendario: decide quali strade mostrare.
 *
 * Su Android nessuna delle tre strade "da computer" funziona: l'app Google
 * Calendar si prende i link a calendar.google.com ma non sa aggiungere un
 * calendario da URL (si apre sulla vista di oggi e basta), `webcal:` non ha
 * nessuna app che lo apra, e un .ics scaricato l'app Google non lo importa.
 * Su iPhone `webcal:` apre il Calendario di sistema, che e' la strada giusta.
 */
export type CalendarPlatform = "android" | "ios" | "desktop";

export function calendarPlatform(userAgent: string, maxTouchPoints = 0): CalendarPlatform {
  if (/Android/i.test(userAgent)) return "android";
  // iPadOS si presenta come Mac: lo tradisce il touch.
  if (/iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) {
    return "ios";
  }
  return "desktop";
}
