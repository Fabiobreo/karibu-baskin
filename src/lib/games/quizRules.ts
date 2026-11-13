import type { AppRole, GameVisibility, QuizLevel as DbQuizLevel } from "@prisma/client";
import { gameAccess, type GameAccess } from "@/lib/games/gameSettings";
import type { QuizQuestion } from "@/lib/content/baskinQuiz";
import { QUIZ_LENGTH } from "@/lib/games/quiz";

/**
 * Regole dei quiz gestiti dal pannello (UX-67), pure e testate: quando un quiz
 * si può accendere, quali domande entrano nel gioco, le statistiche per
 * domanda.
 */

/** Domande approvate (in italiano) che servono per accendere un quiz. */
export const MIN_APPROVED_TO_ENABLE = 8;
/** Uscite di una domanda prima di mostrarne la percentuale di risposte giuste. */
export const MIN_SHOWN_FOR_STATS = 20;
/** Sotto questa quota di risposte giuste una domanda è "da rileggere". */
export const HARD_QUESTION_RATE = 0.25;

/** Id del quiz del Baskin, il primo (migration UX-67). */
export const BASKIN_QUIZ_ID = "baskin";

/** Campi di una domanda come stanno nel database. */
export interface QuizQuestionRow {
  id: string;
  status: "DRAFT" | "APPROVED";
  level: DbQuizLevel;
  topic: string;
  text: string;
  answers: string[];
  correct: number;
  explanation: string;
  source: string | null;
  textEn: string | null;
  answersEn: string[];
  explanationEn: string | null;
}

/** Vero se la domanda ha tutto il testo inglese: domanda, tre risposte, spiegazione. */
export function hasEnglish(
  q: Pick<QuizQuestionRow, "textEn" | "answersEn" | "explanationEn">
): boolean {
  return (
    !!q.textEn?.trim() &&
    !!q.explanationEn?.trim() &&
    q.answersEn.length === 3 &&
    q.answersEn.every((a) => a.trim().length > 0)
  );
}

/**
 * Le domande che il gioco usa, nella lingua di chi guarda: solo le approvate,
 * e in inglese solo quelle tradotte. Ordinate per id, perché la sfida estrae
 * le stesse domande solo da una banca nello stesso ordine.
 */
export function playableBank(
  rows: readonly QuizQuestionRow[],
  locale: string,
  /** Anteprima dello staff: anche le domande in prova, per rileggerle giocando. */
  { includeDrafts = false }: { includeDrafts?: boolean } = {}
): QuizQuestion[] {
  const en = locale === "en";
  return rows
    .filter((q) => (includeDrafts || q.status === "APPROVED") && (!en || hasEnglish(q)))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((q) => ({
      id: q.id,
      level: q.level === "EASY" ? "facile" : "medio",
      topic: q.topic,
      text: en ? q.textEn! : q.text,
      answers: en ? q.answersEn : q.answers,
      correct: q.correct,
      explanation: en ? q.explanationEn! : q.explanation,
      source: q.source,
    }));
}

export interface QuizCounts {
  total: number;
  approved: number;
  /** Approvate con tutto il testo inglese. */
  approvedEn: number;
}

export function countQuestions(
  rows: readonly Pick<QuizQuestionRow, "status" | "textEn" | "answersEn" | "explanationEn">[]
): QuizCounts {
  const approved = rows.filter((q) => q.status === "APPROVED");
  return {
    total: rows.length,
    approved: approved.length,
    approvedEn: approved.filter(hasEnglish).length,
  };
}

/** Un quiz si accende solo con abbastanza domande approvate. */
export function canEnableQuiz(counts: Pick<QuizCounts, "approved">): boolean {
  return counts.approved >= MIN_APPROVED_TO_ENABLE;
}

/** Quante domande approvate mancano per accenderlo (0 se ci sono). */
export function missingToEnable(counts: Pick<QuizCounts, "approved">): number {
  return Math.max(0, MIN_APPROVED_TO_ENABLE - counts.approved);
}

/** "Servono ancora 3 domande approvate" (pannello e API). */
export function missingToEnableText(counts: Pick<QuizCounts, "approved">): string {
  const n = missingToEnable(counts);
  return n === 1 ? "Serve ancora 1 domanda approvata" : `Servono ancora ${n} domande approvate`;
}

/**
 * Vero se nella lingua di chi guarda il quiz ha abbastanza domande per una
 * partita intera. Un quiz acceso che scende sotto il minimo per accenderlo non
 * si spegne da solo: finché ha una partita intera si gioca, e il pannello lo
 * segnala.
 */
export function isPlayableIn(counts: QuizCounts, locale: string): boolean {
  return (locale === "en" ? counts.approvedEn : counts.approved) >= QUIZ_LENGTH;
}

const VISIBILITY_RANK: Record<GameVisibility, number> = { OFF: 0, MEMBERS: 1, PUBLIC: 2 };

/**
 * Lo stato del gioco "quiz" per il resto del sito (menu, sitemap, `/giochi`):
 * quello del quiz più aperto fra quelli che hanno una partita intera.
 */
export function quizGameVisibility(
  quizzes: readonly { visibility: GameVisibility; counts: QuizCounts }[]
): GameVisibility {
  let best: GameVisibility = "OFF";
  for (const q of quizzes) {
    if (!isPlayableIn(q.counts, "it")) continue;
    if (VISIBILITY_RANK[q.visibility] > VISIBILITY_RANK[best]) best = q.visibility;
  }
  return best;
}

/** Quota di risposte giuste, o `null` se la domanda è uscita troppo poco. */
export function correctRate(shown: number, correct: number): number | null {
  return shown >= MIN_SHOWN_FOR_STATS ? correct / shown : null;
}

/** "Da rileggere": troppo difficile o scritta male. */
export function needsReview(shown: number, correct: number): boolean {
  const rate = correctRate(shown, correct);
  return rate !== null && rate < HARD_QUESTION_RATE;
}

/**
 * Le risposte di una partita finita, controllate sul server: solo le domande
 * approvate di quel quiz, una volta ciascuna, con una risposta da 0 a 2.
 */
export function scoreAnswers(
  answers: readonly { id: string; pick: number }[],
  questions: readonly { id: string; correct: number }[]
): { id: string; right: boolean }[] {
  const byId = new Map(questions.map((q) => [q.id, q.correct]));
  const seen = new Set<string>();
  const out: { id: string; right: boolean }[] = [];
  for (const a of answers) {
    const correct = byId.get(a.id);
    if (correct === undefined || seen.has(a.id)) continue;
    seen.add(a.id);
    out.push({ id: a.id, right: a.pick === correct });
  }
  return out;
}

/**
 * Cosa può fare chi guarda con un quiz, come `gameAccess` ma guardando anche
 * le domande: un quiz acceso senza una partita intera nella lingua di chi
 * guarda non si mostra; allo staff un quiz spento si mostra in anteprima,
 * domande in prova comprese, appena ne ha una.
 */
export function quizAccess(
  quiz: { visibility: GameVisibility; counts: QuizCounts },
  role: AppRole | string | null | undefined,
  locale: string
): GameAccess {
  const access = gameAccess(quiz.visibility, role);
  if (access === "hidden") return "hidden";
  if (access === "preview") return quiz.counts.total > 0 ? "preview" : "hidden";
  return isPlayableIn(quiz.counts, locale) ? access : "hidden";
}
