import { describe, it, expect } from "vitest";
import { PostCreateSchema, PollSchema, PollVoteSchema } from "./post";

describe("PostCreateSchema", () => {
  it("accetta un post valido senza poll", () => {
    const result = PostCreateSchema.safeParse({
      title: "Titolo valido",
      body: "<p>Contenuto</p>",
      publish: true,
    });
    expect(result.success).toBe(true);
  });

  it("accetta un post con poll allegato", () => {
    const result = PostCreateSchema.safeParse({
      title: "Cena fine stagione",
      body: "<p>Votate la data</p>",
      publish: true,
      poll: {
        question: "Quale data preferisci?",
        multiSelect: false,
        closesAt: null,
        options: [
          { text: "15 giugno", order: 0 },
          { text: "22 giugno", order: 1 },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it("rifiuta titolo troppo corto", () => {
    const result = PostCreateSchema.safeParse({
      title: "AB",
      body: "<p>ok</p>",
    });
    expect(result.success).toBe(false);
  });

  it("rifiuta body vuoto", () => {
    const result = PostCreateSchema.safeParse({
      title: "Titolo valido",
      body: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("PollSchema", () => {
  it("rifiuta meno di 2 opzioni", () => {
    const result = PollSchema.safeParse({
      question: "Domanda?",
      multiSelect: false,
      options: [{ text: "Solo una", order: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rifiuta più di 8 opzioni", () => {
    const result = PollSchema.safeParse({
      question: "Domanda?",
      multiSelect: true,
      options: Array.from({ length: 9 }, (_, i) => ({ text: `Opzione ${i}`, order: i })),
    });
    expect(result.success).toBe(false);
  });
});

describe("PollVoteSchema", () => {
  it("rifiuta lista voti vuota", () => {
    const result = PollVoteSchema.safeParse({ optionIds: [] });
    expect(result.success).toBe(false);
  });
});
