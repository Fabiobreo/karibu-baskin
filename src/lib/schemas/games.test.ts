import { describe, expect, it } from "vitest";
import { PredictionSchema, QuizBestSchema } from "./games";

describe("QuizBestSchema", () => {
  it("accetta solo interi da 0 a 5", () => {
    expect(QuizBestSchema.safeParse({ score: 0 }).success).toBe(true);
    expect(QuizBestSchema.safeParse({ score: 5 }).success).toBe(true);
    expect(QuizBestSchema.safeParse({ score: 6 }).success).toBe(false);
    expect(QuizBestSchema.safeParse({ score: -1 }).success).toBe(false);
    expect(QuizBestSchema.safeParse({ score: 2.5 }).success).toBe(false);
    expect(QuizBestSchema.safeParse({ score: "4" }).success).toBe(false);
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
