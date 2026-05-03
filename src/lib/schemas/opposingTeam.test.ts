import { describe, it, expect } from "vitest";
import { OpposingTeamCreateSchema, OpposingTeamUpdateSchema } from "./opposingTeam";

// ─── OpposingTeamCreateSchema ─────────────────────────────────────────────────

describe("OpposingTeamCreateSchema", () => {
  const valid = { name: "Eagles Vicenza" };

  it("accetta un payload minimo valido (solo nome)", () => {
    expect(OpposingTeamCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("accetta un payload completo", () => {
    const full = {
      name: "Eagles Vicenza",
      city: "Vicenza",
      notes: "Squadra molto tecnica",
    };
    expect(OpposingTeamCreateSchema.safeParse(full).success).toBe(true);
  });

  it("rifiuta nome vuoto", () => {
    const result = OpposingTeamCreateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Nome obbligatorio");
    }
  });

  it("rifiuta nome oltre 200 caratteri", () => {
    expect(OpposingTeamCreateSchema.safeParse({ name: "x".repeat(201) }).success).toBe(false);
  });

  it("rifiuta nome mancante", () => {
    expect(OpposingTeamCreateSchema.safeParse({}).success).toBe(false);
  });

  it("rifiuta city oltre 200 caratteri", () => {
    expect(
      OpposingTeamCreateSchema.safeParse({ name: "Eagles", city: "x".repeat(201) }).success,
    ).toBe(false);
  });

  it("rifiuta notes oltre 2000 caratteri", () => {
    expect(
      OpposingTeamCreateSchema.safeParse({ name: "Eagles", notes: "x".repeat(2001) }).success,
    ).toBe(false);
  });
});

// ─── OpposingTeamUpdateSchema ─────────────────────────────────────────────────

describe("OpposingTeamUpdateSchema", () => {
  it("accetta un oggetto vuoto (tutti i campi opzionali)", () => {
    expect(OpposingTeamUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accetta aggiornamento solo del nome", () => {
    expect(OpposingTeamUpdateSchema.safeParse({ name: "Lions Padova" }).success).toBe(true);
  });

  it("rifiuta nome vuoto se fornito", () => {
    const result = OpposingTeamUpdateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Il nome non può essere vuoto");
    }
  });

  it("accetta city null (reset città)", () => {
    expect(OpposingTeamUpdateSchema.safeParse({ city: null }).success).toBe(true);
  });

  it("accetta notes null (reset note)", () => {
    expect(OpposingTeamUpdateSchema.safeParse({ notes: null }).success).toBe(true);
  });

  it("rifiuta notes oltre 2000 caratteri", () => {
    expect(OpposingTeamUpdateSchema.safeParse({ notes: "x".repeat(2001) }).success).toBe(false);
  });
});
