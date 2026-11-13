import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { GameVisibility } from "@prisma/client";
import { prisma } from "@/lib/db";
import { resolveGameSettings, type GameSettings } from "@/lib/games/gameSettings";
import {
  countQuestions,
  playableBank,
  quizGameVisibility,
  type QuizCounts,
  type QuizQuestionRow,
} from "@/lib/games/quizRules";
import type { QuizQuestion } from "@/lib/content/baskinQuiz";

/** Tag della cache di giochi e quiz: ogni scrittura del pannello lo svuota. */
export const GAME_SETTINGS_TAG = "game-settings";

/** Un quiz come lo vedono `/giochi`, il menu e la sitemap. */
export interface QuizSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  titleEn: string | null;
  descriptionEn: string | null;
  visibility: GameVisibility;
  position: number;
  counts: QuizCounts;
}

interface GamesSnapshot {
  settings: GameSettings;
  quizzes: QuizSummary[];
}

const QUESTION_ROW_SELECT = {
  id: true,
  status: true,
  level: true,
  topic: true,
  text: true,
  answers: true,
  correct: true,
  explanation: true,
  source: true,
  textEn: true,
  answersEn: true,
  explanationEn: true,
} as const;

// Il menu legge lo stato dei giochi a ogni pagina: in cache, così non costa una
// query a richiesta. Cambia solo dal pannello, che svuota il tag; i cinque
// minuti sono una rete di sicurezza.
const loadSnapshot = unstable_cache(
  async (): Promise<GamesSnapshot> => {
    const [rows, quizzes] = await Promise.all([
      prisma.gameSetting.findMany({ select: { game: true, visibility: true } }),
      prisma.quiz.findMany({
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          titleEn: true,
          descriptionEn: true,
          visibility: true,
          position: true,
          questions: {
            select: { status: true, textEn: true, answersEn: true, explanationEn: true },
          },
        },
      }),
    ]);
    const summaries = quizzes.map(({ questions, ...q }) => ({
      ...q,
      counts: countQuestions(questions),
    }));
    // Lo stato del gioco "quiz" è quello del quiz più aperto (UX-67).
    const settings = { ...resolveGameSettings(rows), quiz: quizGameVisibility(summaries) };
    return { settings, quizzes: summaries };
  },
  ["games-snapshot"],
  { tags: [GAME_SETTINGS_TAG], revalidate: 300 }
);

const OFF_SNAPSHOT: GamesSnapshot = {
  settings: { ...resolveGameSettings([]), quiz: "OFF" },
  quizzes: [],
};

const loadSnapshotSafe = cache(async (): Promise<GamesSnapshot> => {
  try {
    return await loadSnapshot();
  } catch (err) {
    console.error("[games] impostazioni non lette", err);
    return OFF_SNAPSHOT;
  }
});

/**
 * Stato di ogni gioco (UX-66). In cache per richiesta e fra le richieste. Se
 * il database non risponde valgono i default (quiz spento, gli altri dei
 * tesserati): mai una pagina rotta per colpa del menu.
 */
export async function loadGameSettings(): Promise<GameSettings> {
  return (await loadSnapshotSafe()).settings;
}

/** Tutti i quiz, nell'ordine del pannello, con il numero di domande (UX-67). */
export async function loadQuizSummaries(): Promise<QuizSummary[]> {
  return (await loadSnapshotSafe()).quizzes;
}

const loadQuizRows = unstable_cache(
  async (quizId: string): Promise<QuizQuestionRow[]> =>
    prisma.quizQuestion.findMany({
      where: { quizId, status: "APPROVED" },
      select: QUESTION_ROW_SELECT,
    }),
  ["quiz-rows"],
  { tags: [GAME_SETTINGS_TAG], revalidate: 300 }
);

/** Le domande che il gioco usa per un quiz, nella lingua di chi guarda. */
export async function loadQuizBank(quizId: string, locale: string): Promise<QuizQuestion[]> {
  return playableBank(await loadQuizRows(quizId), locale);
}

/**
 * Anteprima dello staff (quiz spento): tutte le domande, anche in prova, così
 * chi rivede il quiz lo prova come lo giocherà. Senza cache: solo staff.
 */
export async function loadQuizPreviewBank(quizId: string, locale: string): Promise<QuizQuestion[]> {
  const rows = await prisma.quizQuestion.findMany({
    where: { quizId },
    select: QUESTION_ROW_SELECT,
  });
  return playableBank(rows, locale, { includeDrafts: true });
}
