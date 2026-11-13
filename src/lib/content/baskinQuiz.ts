/**
 * Quiz del club (UX-61, UX-67): tipi ed elenchi chiusi.
 *
 * Le domande stanno nel database (`Quiz`, `QuizQuestion`) e le gestisce
 * l'admin in `/admin/giochi/quiz`. Le 40 domande del quiz del Baskin che erano
 * qui sono entrate nel database con la migration `20261113180000_quiz_panel`.
 * Quando una regola cambia su `/il-baskin` o nella storia del club, si
 * controllano anche le domande dal pannello.
 */

export type QuizLevel = "facile" | "medio";

/** Argomenti di una domanda, con l'etichetta del pannello (solo italiano). */
export const QUIZ_TOPICS = {
  ruoli: "Ruoli",
  campo: "Campo e regole",
  canestri: "Canestri",
  storia: "Storia del Baskin",
  club: "Il club",
  altro: "Altro",
} as const;
export type QuizTopic = keyof typeof QUIZ_TOPICS;

/** Una domanda come arriva al gioco, già nella lingua di chi guarda. */
export interface QuizQuestion {
  id: string;
  level: QuizLevel;
  topic: string;
  text: string;
  /** Sempre tre: meno carico di lettura. */
  answers: string[];
  /** Indice della risposta giusta (0, 1 o 2). */
  correct: number;
  /** Due righe al massimo, lette dopo la risposta, giusta o no. */
  explanation: string;
  /** Domanda ancora in prova: esce solo nell'anteprima dello staff, con il chip "In prova". */
  draft?: boolean;
}
