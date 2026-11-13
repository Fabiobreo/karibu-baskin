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

/** Dove si legge di più. Elenco chiuso: `baskinQuiz.test.ts` controlla che le pagine esistano. */
export const QUIZ_SOURCES = [
  "/il-baskin#in-breve",
  "/il-baskin#campo",
  "/il-baskin#ruoli",
  "/il-baskin#regole",
  "/il-baskin#origini",
  "/il-club",
  "/contatti#vieni-a-provare",
] as const;
export type QuizSource = (typeof QUIZ_SOURCES)[number];

/** Etichette delle pagine "Scopri di più" nel pannello. */
export const QUIZ_SOURCE_LABELS: Record<QuizSource, string> = {
  "/il-baskin#in-breve": "Il Baskin: in breve",
  "/il-baskin#campo": "Il Baskin: il campo",
  "/il-baskin#ruoli": "Il Baskin: i ruoli",
  "/il-baskin#regole": "Il Baskin: le regole",
  "/il-baskin#origini": "Il Baskin: le origini",
  "/il-club": "Il club",
  "/contatti#vieni-a-provare": "Vieni a provare",
};

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
  /** Pagina "Scopri di più", o `null` senza link. */
  source: string | null;
  /** Domanda ancora in prova: esce solo nell'anteprima dello staff, con il chip "In prova". */
  draft?: boolean;
}
