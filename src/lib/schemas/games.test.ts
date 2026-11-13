import { describe, expect, it } from "vitest";
import { PredictionSchema, QuizBestSchema, QuizPlayedSchema } from "./games";

describe("QuizBestSchema", () => {
  it("accetta solo interi da 0 a 10 (il limite del quiz lo controlla la rotta)", () => {
    expect(QuizBestSchema.safeParse({ quizId: "baskin", score: 0 }).success).toBe(true);
    expect(QuizBestSchema.safeParse({ quizId: "baskin", score: 5 }).success).toBe(true);
    expect(QuizBestSchema.safeParse({ quizId: "baskin", score: 11 }).success).toBe(false);
    expect(QuizBestSchema.safeParse({ quizId: "baskin", score: -1 }).success).toBe(false);
    expect(QuizBestSchema.safeParse({ quizId: "baskin", score: 2.5 }).success).toBe(false);
    expect(QuizBestSchema.safeParse({ quizId: "baskin", score: "4" }).success).toBe(false);
  });
});

describe("PredictionSchema", () => {
  it("accetta solo chi vince", () => {
    expect(PredictionSchema.parse({ outcome: "WIN" })).toEqual({
      outcome: "WIN",
      ourScore: null,
      theirScore: null,
    });
  });

  it("accetta un punteggio coerente con il risultato", () => {
    expect(
      PredictionSchema.safeParse({ outcome: "WIN", ourScore: 40, theirScore: 30 }).success
    ).toBe(true);
    expect(
      PredictionSchema.safeParse({ outcome: "DRAW", ourScore: 30, theirScore: 30 }).success
    ).toBe(true);
    expect(
      PredictionSchema.safeParse({ outcome: "LOSS", ourScore: 20, theirScore: 30 }).success
    ).toBe(true);
  });

  it("rifiuta un punteggio che dice un altro risultato", () => {
    expect(
      PredictionSchema.safeParse({ outcome: "WIN", ourScore: 20, theirScore: 30 }).success
    ).toBe(false);
    expect(
      PredictionSchema.safeParse({ outcome: "DRAW", ourScore: 31, theirScore: 30 }).success
    ).toBe(false);
  });

  it("rifiuta un punteggio a metà, negativo o troppo alto", () => {
    expect(PredictionSchema.safeParse({ outcome: "WIN", ourScore: 40 }).success).toBe(false);
    expect(
      PredictionSchema.safeParse({ outcome: "WIN", ourScore: -1, theirScore: -3 }).success
    ).toBe(false);
    expect(
      PredictionSchema.safeParse({ outcome: "WIN", ourScore: 500, theirScore: 3 }).success
    ).toBe(false);
  });

  it("rifiuta un risultato che non esiste", () => {
    expect(PredictionSchema.safeParse({ outcome: "MAYBE" }).success).toBe(false);
    expect(PredictionSchema.safeParse({}).success).toBe(false);
  });
});

describe("QuizPlayedSchema", () => {
  it("accetta fino a 10 risposte da 0 a 2", () => {
    expect(
      QuizPlayedSchema.safeParse({ quizId: "baskin", answers: [{ id: "nato", pick: 1 }] }).success
    ).toBe(true);
    expect(QuizPlayedSchema.safeParse({ quizId: "baskin", answers: [] }).success).toBe(true);
    expect(
      QuizPlayedSchema.safeParse({ quizId: "baskin", answers: [{ id: "nato", pick: 3 }] }).success
    ).toBe(false);
    expect(
      QuizPlayedSchema.safeParse({
        quizId: "baskin",
        answers: Array.from({ length: 11 }, (_, i) => ({ id: `q${i}`, pick: 0 })),
      }).success
    ).toBe(false);
    expect(QuizPlayedSchema.safeParse({ answers: [] }).success).toBe(false);
  });
});
