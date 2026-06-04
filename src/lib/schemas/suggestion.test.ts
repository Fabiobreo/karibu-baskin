import { describe, it, expect } from "vitest";
import {
  SuggestionCreateSchema,
  SuggestionUpdateSchema,
  SuggestionNoteCreateSchema,
} from "./suggestion";

describe("SuggestionCreateSchema", () => {
  it("accetta un payload valido", () => {
    const result = SuggestionCreateSchema.safeParse({
      category: "APP",
      message: "Sarebbe utile poter vedere le statistiche storiche.",
    });
    expect(result.success).toBe(true);
  });

  it("applica il trim al messaggio", () => {
    const result = SuggestionCreateSchema.safeParse({
      category: "ALTRO",
      message: "   ciao a tutti   ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.message).toBe("ciao a tutti");
  });

  it("rifiuta messaggio troppo corto", () => {
    const result = SuggestionCreateSchema.safeParse({ category: "APP", message: "ciao" });
    expect(result.success).toBe(false);
  });

  it("rifiuta messaggio troppo lungo", () => {
    const result = SuggestionCreateSchema.safeParse({
      category: "APP",
      message: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("rifiuta categoria non valida", () => {
    const result = SuggestionCreateSchema.safeParse({
      category: "INESISTENTE",
      message: "messaggio valido abbastanza lungo",
    });
    expect(result.success).toBe(false);
  });
});

describe("SuggestionUpdateSchema", () => {
  it("accetta aggiornamento di stato valido", () => {
    expect(SuggestionUpdateSchema.safeParse({ status: "LETTO" }).success).toBe(true);
  });

  it("rifiuta payload vuoto", () => {
    expect(SuggestionUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("rifiuta stato non valido", () => {
    expect(SuggestionUpdateSchema.safeParse({ status: "BOH" }).success).toBe(false);
  });
});

describe("SuggestionNoteCreateSchema", () => {
  it("accetta una nota valida", () => {
    expect(
      SuggestionNoteCreateSchema.safeParse({ body: "Ottima idea, la valutiamo." }).success
    ).toBe(true);
  });

  it("applica il trim", () => {
    const result = SuggestionNoteCreateSchema.safeParse({ body: "  ok  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body).toBe("ok");
  });

  it("rifiuta nota vuota", () => {
    expect(SuggestionNoteCreateSchema.safeParse({ body: "   " }).success).toBe(false);
  });

  it("rifiuta nota troppo lunga", () => {
    expect(SuggestionNoteCreateSchema.safeParse({ body: "a".repeat(1001) }).success).toBe(false);
  });
});
