import { z } from "zod";
import { QUIZ_LENGTH } from "@/lib/games/quiz";

/** Stato di un gioco dal pannello (UX-66); quali stati ha ogni gioco lo dice `GAME_RULES`. */
export const GameSettingUpdateSchema = z.object({
  visibility: z.enum(["OFF", "MEMBERS", "PUBLIC"], { message: "Stato non valido" }),
});

/** Migliore partita di un quiz (UX-61, UX-67): un intero da 0 a 5. */
export const QuizBestSchema = z.object({
  quizId: z.string().min(1).max(64),
  score: z.int().min(0).max(QUIZ_LENGTH),
});

/** Partita di un quiz finita (UX-67): le risposte date, che il server ricontrolla. */
export const QuizPlayedSchema = z.object({
  quizId: z.string().min(1).max(64),
  answers: z
    .array(z.object({ id: z.string().min(1).max(64), pick: z.int().min(0).max(2) }))
    .max(QUIZ_LENGTH),
});

/** Punteggio massimo accettato in un pronostico: abbastanza per qualunque partita. */
export const MAX_PREDICTED_SCORE = 199;

const scoreField = z.int().min(0).max(MAX_PREDICTED_SCORE).nullable().optional();

/**
 * Pronostico di una partita (UX-61): chi vince e, facoltativo, il punteggio.
 * Il punteggio va messo tutto o per niente, e deve dire la stessa cosa del
 * risultato scelto ("vinciamo noi" con 40 a 52 non ha senso).
 */
export const PredictionSchema = z
  .object({
    outcome: z.enum(["WIN", "DRAW", "LOSS"]),
    ourScore: scoreField,
    theirScore: scoreField,
  })
  .superRefine((v, ctx) => {
    const our = v.ourScore ?? null;
    const their = v.theirScore ?? null;
    if ((our === null) !== (their === null)) {
      ctx.addIssue({ code: "custom", message: "Scrivi tutti e due i punteggi, o nessuno" });
      return;
    }
    if (our === null || their === null) return;
    const scoreOutcome = our > their ? "WIN" : our < their ? "LOSS" : "DRAW";
    if (scoreOutcome !== v.outcome) {
      ctx.addIssue({ code: "custom", message: "Il punteggio non dice lo stesso risultato" });
    }
  })
  .transform((v) => ({
    outcome: v.outcome,
    ourScore: v.ourScore ?? null,
    theirScore: v.theirScore ?? null,
  }));
export type PredictionInput = z.infer<typeof PredictionSchema>;
