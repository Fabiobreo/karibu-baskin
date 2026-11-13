import { z } from "zod";
import { QUIZ_TOPICS, type QuizTopic } from "@/lib/content/baskinQuiz";
import { QUIZ_ARTS } from "@/lib/games/gameArt";
import { MAX_QUIZ_LENGTH, MIN_QUIZ_LENGTH } from "@/lib/games/quiz";

/**
 * Schemi dei quiz gestiti dal pannello (UX-67). I messaggi sono per l'admin,
 * in italiano.
 */

const text = (max: number, message: string) => z.string().trim().min(1, message).max(max);
/** Domande per partita: da 3 a 10. */
const questionCount = z
  .int({ message: "Scegli quante domande per partita" })
  .min(MIN_QUIZ_LENGTH, `Almeno ${MIN_QUIZ_LENGTH} domande per partita`)
  .max(MAX_QUIZ_LENGTH, `Al massimo ${MAX_QUIZ_LENGTH} domande per partita`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

export const QuizCreateSchema = z.object({
  title: text(80, "Scrivi il titolo"),
  description: text(200, "Scrivi una riga di descrizione"),
  titleEn: optionalText(80),
  descriptionEn: optionalText(200),
  /** Disegno della card in /giochi (UX-68). */
  art: z.enum(QUIZ_ARTS, { message: "Disegno non valido" }).optional(),
  questionCount: questionCount.optional(),
});

export const QuizUpdateSchema = z
  .object({
    title: text(80, "Scrivi il titolo").optional(),
    description: text(200, "Scrivi una riga di descrizione").optional(),
    // Vuoto = togli la traduzione (la rotta lo salva come null).
    titleEn: z.string().trim().max(80).nullable().optional(),
    descriptionEn: z.string().trim().max(200).nullable().optional(),
    art: z.enum(QUIZ_ARTS, { message: "Disegno non valido" }).optional(),
    questionCount: questionCount.optional(),
    visibility: z.enum(["OFF", "MEMBERS", "PUBLIC"], { message: "Stato non valido" }).optional(),
    /** Sposta il quiz di un posto nell'elenco. */
    move: z.enum(["up", "down"]).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Niente da salvare");

const TOPIC_KEYS = Object.keys(QUIZ_TOPICS) as [QuizTopic, ...QuizTopic[]];

const answers = z
  .array(z.string().trim().min(1, "Scrivi tutte e tre le risposte").max(120))
  .length(3, "Servono tre risposte");

/**
 * Una domanda: tre risposte diverse, quella giusta, la spiegazione. L'inglese
 * è facoltativo ma tutto o niente: una domanda tradotta a metà non uscirebbe a
 * nessuno.
 */
export const QuizQuestionSchema = z
  .object({
    level: z.enum(["EASY", "MEDIUM"], { message: "Scegli il livello" }),
    topic: z.enum(TOPIC_KEYS, { message: "Scegli l'argomento" }),
    text: text(200, "Scrivi la domanda"),
    answers,
    correct: z.int().min(0).max(2, "Scegli la risposta giusta"),
    explanation: text(300, "Scrivi la spiegazione"),
    textEn: optionalText(200),
    answersEn: z
      .array(z.string().trim().max(120))
      .max(3)
      .optional()
      .transform((v) => (v && v.some((a) => a.length > 0) ? v : [])),
    explanationEn: optionalText(300),
    /** "Salva e approva". */
    approve: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (new Set(v.answers.map((a) => a.toLowerCase())).size < 3) {
      ctx.addIssue({ code: "custom", message: "Le tre risposte devono essere diverse" });
    }
    const en = [v.textEn, v.explanationEn, ...v.answersEn];
    const filled = en.filter((x) => x && x.length > 0).length;
    if (filled > 0 && (filled < 5 || v.answersEn.length !== 3)) {
      ctx.addIssue({
        code: "custom",
        message: "In inglese servono domanda, tre risposte e spiegazione, o niente",
      });
    }
  });

/** Azioni sulla sola domanda, senza riscriverla. */
export const QuizQuestionActionSchema = z.object({
  action: z.enum(["approve", "draft", "resetStats"]),
});
