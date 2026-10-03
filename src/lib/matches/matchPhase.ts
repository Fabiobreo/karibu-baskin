import { isSameRomeDay } from "@/lib/dateUtils";

/** Quanto dura "In corso" dopo l'inizio di una partita senza punteggio. */
export const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

/**
 * Fase di una partita per la pagina di dettaglio (UX-50):
 * - `upcoming`: non ancora iniziata;
 * - `live`: iniziata da meno di 3 ore e senza punteggio ("In corso");
 * - `awaitingResult`: iniziata da piu' di 3 ore, punteggio non ancora inserito
 *   ("Risultato in arrivo");
 * - `played`: c'e' il punteggio.
 */
export type MatchPhase = "upcoming" | "live" | "awaitingResult" | "played";

export function matchPhase(date: Date | string, hasScore: boolean, now: number): MatchPhase {
  if (hasScore) return "played";
  const start = new Date(date).getTime();
  if (start > now) return "upcoming";
  return now - start < LIVE_WINDOW_MS ? "live" : "awaitingResult";
}

/**
 * Il blocco "Dove e quando" resta finche' la partita non e' giocata: prima
 * dell'inizio e per tutto il giorno della partita (ora di Roma).
 */
export function showWhereWhen(date: Date | string, phase: MatchPhase, now: number): boolean {
  if (phase === "played") return false;
  if (phase === "upcoming") return true;
  return isSameRomeDay(date, now);
}
