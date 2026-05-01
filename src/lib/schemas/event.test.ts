import { describe, it, expect } from "vitest";
import { EventCreateSchema, EventUpdateSchema } from "./event";

// ─── EventCreateSchema ────────────────────────────────────────────────────────

describe("EventCreateSchema", () => {
  const valid = {
    title: "Torneo di primavera",
    date: "2025-04-20T09:00",
  };

  it("accetta un payload minimo valido", () => {
    expect(EventCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("accetta un payload completo", () => {
    const full = {
      ...valid,
      endDate: "2025-04-20T18:00",
      location: "Palasport Montecchio",
      description: "Torneo amichevole di primavera",
    };
    expect(EventCreateSchema.safeParse(full).success).toBe(true);
  });

  it("rifiuta titolo vuoto", () => {
    const result = EventCreateSchema.safeParse({ ...valid, title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Titolo obbligatorio");
    }
  });

  it("rifiuta titolo oltre 200 caratteri", () => {
    expect(EventCreateSchema.safeParse({ ...valid, title: "x".repeat(201) }).success).toBe(false);
  });

  it("rifiuta titolo mancante", () => {
    const { title: _, ...rest } = valid;
    expect(EventCreateSchema.safeParse(rest).success).toBe(false);
  });

  it("rifiuta data vuota", () => {
    const result = EventCreateSchema.safeParse({ ...valid, date: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Data obbligatoria");
    }
  });

  it("rifiuta data mancante", () => {
    const { date: _, ...rest } = valid;
    expect(EventCreateSchema.safeParse(rest).success).toBe(false);
  });

  it("accetta endDate null", () => {
    expect(EventCreateSchema.safeParse({ ...valid, endDate: null }).success).toBe(true);
  });

  it("rifiuta location oltre 200 caratteri", () => {
    expect(
      EventCreateSchema.safeParse({ ...valid, location: "x".repeat(201) }).success,
    ).toBe(false);
  });

  it("rifiuta description oltre 2000 caratteri", () => {
    expect(
      EventCreateSchema.safeParse({ ...valid, description: "x".repeat(2001) }).success,
    ).toBe(false);
  });
});

// ─── EventUpdateSchema ────────────────────────────────────────────────────────

describe("EventUpdateSchema", () => {
  it("accetta un oggetto vuoto (tutti i campi opzionali)", () => {
    expect(EventUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accetta aggiornamento solo del titolo", () => {
    expect(EventUpdateSchema.safeParse({ title: "Torneo estivo" }).success).toBe(true);
  });

  it("rifiuta titolo vuoto se fornito", () => {
    const result = EventUpdateSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rifiuta data vuota se fornita", () => {
    const result = EventUpdateSchema.safeParse({ date: "" });
    expect(result.success).toBe(false);
  });

  it("accetta endDate null (rimozione data fine)", () => {
    expect(EventUpdateSchema.safeParse({ endDate: null }).success).toBe(true);
  });

  it("accetta location null (rimozione luogo)", () => {
    expect(EventUpdateSchema.safeParse({ location: null }).success).toBe(true);
  });

  it("accetta description null (rimozione descrizione)", () => {
    expect(EventUpdateSchema.safeParse({ description: null }).success).toBe(true);
  });

  it("rifiuta description oltre 2000 caratteri", () => {
    expect(EventUpdateSchema.safeParse({ description: "x".repeat(2001) }).success).toBe(false);
  });
});
