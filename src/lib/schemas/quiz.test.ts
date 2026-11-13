import { describe, expect, it } from "vitest";
import { QuizCreateSchema, QuizQuestionSchema, QuizUpdateSchema } from "./quiz";

const question = {
  level: "EASY",
  topic: "ruoli",
  text: "Quanti ruoli ci sono nel Baskin?",
  answers: ["3", "5", "7"],
  correct: 1,
  explanation: "I ruoli sono cinque.",
};

describe("QuizCreateSchema", () => {
  it("vuole titolo e descrizione; l'inglese vuoto diventa null", () => {
    const ok = QuizCreateSchema.safeParse({
      title: "Natale",
      description: "5 domande",
      titleEn: "",
    });
    expect(ok.success && ok.data.titleEn).toBeNull();
    expect(QuizCreateSchema.safeParse({ title: " ", description: "x" }).success).toBe(false);
  });
});

describe("QuizUpdateSchema", () => {
  it("rifiuta un corpo vuoto e uno stato inventato", () => {
    expect(QuizUpdateSchema.safeParse({}).success).toBe(false);
    expect(QuizUpdateSchema.safeParse({ visibility: "ON" }).success).toBe(false);
    expect(QuizUpdateSchema.safeParse({ move: "up" }).success).toBe(true);
  });
});

describe("QuizQuestionSchema", () => {
  it("accetta una domanda completa, senza inglese", () => {
    const r = QuizQuestionSchema.safeParse(question);
    expect(r.success).toBe(true);
    expect(r.success && r.data.answersEn).toEqual([]);
  });

  it("vuole tre risposte diverse e un indice valido", () => {
    expect(QuizQuestionSchema.safeParse({ ...question, answers: ["a", "b"] }).success).toBe(false);
    expect(QuizQuestionSchema.safeParse({ ...question, answers: ["a", "A", "b"] }).success).toBe(
      false
    );
    expect(QuizQuestionSchema.safeParse({ ...question, correct: 3 }).success).toBe(false);
  });

  it("l'inglese è tutto o niente", () => {
    expect(QuizQuestionSchema.safeParse({ ...question, textEn: "How many roles?" }).success).toBe(
      false
    );
    expect(
      QuizQuestionSchema.safeParse({
        ...question,
        textEn: "How many roles?",
        answersEn: ["3", "5", "7"],
        explanationEn: "Five roles.",
      }).success
    ).toBe(true);
    expect(
      QuizQuestionSchema.safeParse({ ...question, answersEn: ["", "", ""], textEn: "" }).success
    ).toBe(true);
  });

  it("l'argomento viene dall'elenco chiuso", () => {
    expect(QuizQuestionSchema.safeParse({ ...question, topic: "calcio" }).success).toBe(false);
  });
});
