import { describe, it, expect } from "vitest";
import { CompetitiveTeamCreateSchema, CompetitiveTeamUpdateSchema } from "./competitiveTeam";

// ─── CompetitiveTeamCreateSchema ──────────────────────────────────────────────

describe("CompetitiveTeamCreateSchema", () => {
  const valid = {
    name: "Karibu A",
    season: "2025-26",
  };

  it("accetta un payload minimo valido", () => {
    expect(CompetitiveTeamCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("accetta un payload completo", () => {
    const full = {
      ...valid,
      championship: "Serie B Regionale",
      color: "#FF6600",
      description: "Prima squadra della stagione",
    };
    expect(CompetitiveTeamCreateSchema.safeParse(full).success).toBe(true);
  });

  it("rifiuta nome vuoto", () => {
    const result = CompetitiveTeamCreateSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Nome obbligatorio");
    }
  });

  it("rifiuta nome oltre 200 caratteri", () => {
    expect(
      CompetitiveTeamCreateSchema.safeParse({ ...valid, name: "x".repeat(201) }).success,
    ).toBe(false);
  });

  it("accetta stagione in formato corretto YYYY-YY", () => {
    expect(CompetitiveTeamCreateSchema.safeParse({ ...valid, season: "2024-25" }).success).toBe(
      true,
    );
  });

  it("rifiuta stagione in formato errato (YYYY-YYYY)", () => {
    const result = CompetitiveTeamCreateSchema.safeParse({ ...valid, season: "2025-2026" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("YYYY-YY");
    }
  });

  it("rifiuta stagione in formato errato (testo libero)", () => {
    expect(CompetitiveTeamCreateSchema.safeParse({ ...valid, season: "primavera" }).success).toBe(
      false,
    );
  });

  it("accetta colore hex valido (#RRGGBB)", () => {
    expect(
      CompetitiveTeamCreateSchema.safeParse({ ...valid, color: "#1A2B3C" }).success,
    ).toBe(true);
  });

  it("accetta colore hex con lettere maiuscole e minuscole miste", () => {
    expect(
      CompetitiveTeamCreateSchema.safeParse({ ...valid, color: "#aAbBcC" }).success,
    ).toBe(true);
  });

  it("rifiuta colore hex senza cancelletto", () => {
    expect(
      CompetitiveTeamCreateSchema.safeParse({ ...valid, color: "FF6600" }).success,
    ).toBe(false);
  });

  it("rifiuta colore hex con 3 cifre (shorthand non supportato)", () => {
    expect(CompetitiveTeamCreateSchema.safeParse({ ...valid, color: "#F60" }).success).toBe(false);
  });

  it("rifiuta colore hex con caratteri non validi", () => {
    expect(
      CompetitiveTeamCreateSchema.safeParse({ ...valid, color: "#GGGGGG" }).success,
    ).toBe(false);
  });

  it("rifiuta description oltre 2000 caratteri", () => {
    expect(
      CompetitiveTeamCreateSchema.safeParse({ ...valid, description: "x".repeat(2001) }).success,
    ).toBe(false);
  });
});

// ─── CompetitiveTeamUpdateSchema ──────────────────────────────────────────────

describe("CompetitiveTeamUpdateSchema", () => {
  it("accetta un oggetto vuoto (tutti i campi opzionali)", () => {
    expect(CompetitiveTeamUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accetta aggiornamento solo del nome", () => {
    expect(CompetitiveTeamUpdateSchema.safeParse({ name: "Karibu B" }).success).toBe(true);
  });

  it("rifiuta nome vuoto se fornito", () => {
    const result = CompetitiveTeamUpdateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Il nome non può essere vuoto");
    }
  });

  it("accetta color null (reset colore)", () => {
    expect(CompetitiveTeamUpdateSchema.safeParse({ color: null }).success).toBe(true);
  });

  it("rifiuta colore hex non valido anche in update", () => {
    expect(CompetitiveTeamUpdateSchema.safeParse({ color: "arancione" }).success).toBe(false);
  });

  it("accetta stagione valida in update", () => {
    expect(CompetitiveTeamUpdateSchema.safeParse({ season: "2026-27" }).success).toBe(true);
  });

  it("rifiuta stagione non valida in update", () => {
    expect(CompetitiveTeamUpdateSchema.safeParse({ season: "26-27" }).success).toBe(false);
  });

  it("accetta championship null (reset)", () => {
    expect(CompetitiveTeamUpdateSchema.safeParse({ championship: null }).success).toBe(true);
  });

  it("rifiuta championship oltre 200 caratteri", () => {
    expect(
      CompetitiveTeamUpdateSchema.safeParse({ championship: "x".repeat(201) }).success,
    ).toBe(false);
  });

  it("accetta description null (reset)", () => {
    expect(CompetitiveTeamUpdateSchema.safeParse({ description: null }).success).toBe(true);
  });
});
