/**
 * Disegni delle card dei quiz in `/giochi` (UX-68): elenco chiuso, l'admin ne
 * sceglie uno per quiz dal pannello. Niente immagini caricate: i disegni sono
 * SVG del sito (`GameArt`), uguali nei due temi.
 */
export const QUIZ_ARTS = ["questions", "club", "teams", "history"] as const;

export type QuizArt = (typeof QUIZ_ARTS)[number];

export const DEFAULT_QUIZ_ART: QuizArt = "questions";

/** Etichette per il pannello (solo italiano). */
export const QUIZ_ART_LABELS: Record<QuizArt, string> = {
  questions: "Domande",
  club: "Club",
  teams: "Squadre",
  history: "Storia",
};

export function isQuizArt(value: unknown): value is QuizArt {
  return typeof value === "string" && (QUIZ_ARTS as readonly string[]).includes(value);
}

/** Il disegno di un quiz; un valore sconosciuto nel database torna al default. */
export function quizArt(value: string | null | undefined): QuizArt {
  return isQuizArt(value) ? value : DEFAULT_QUIZ_ART;
}

/**
 * Colonne della griglia da desktop: tre solo quando le card riempiono le
 * righe (3, 6, ...), altrimenti due, così nessuna card resta sola.
 */
export function gamesGridColumns(count: number): 2 | 3 {
  return count >= 3 && count % 3 === 0 ? 3 : 2;
}
