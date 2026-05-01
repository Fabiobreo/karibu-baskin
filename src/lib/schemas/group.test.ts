import { describe, it, expect } from "vitest";
import { GroupCreateSchema, GroupUpdateSchema, GroupMatchCreateSchema } from "./group";

// ─── GroupCreateSchema ────────────────────────────────────────────────────────

describe("GroupCreateSchema", () => {
  const valid = {
    name: "Girone A",
    season: "2025-26",
    teamId: "team-1",
  };

  it("accetta un payload minimo valido", () => {
    expect(GroupCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("accetta un payload completo (con championship)", () => {
    expect(
      GroupCreateSchema.safeParse({ ...valid, championship: "Campionato Regionale" }).success,
    ).toBe(true);
  });

  it("rifiuta nome vuoto", () => {
    const result = GroupCreateSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Nome obbligatorio");
    }
  });

  it("rifiuta nome oltre 200 caratteri", () => {
    expect(GroupCreateSchema.safeParse({ ...valid, name: "x".repeat(201) }).success).toBe(false);
  });

  it("rifiuta stagione in formato errato (YYYY-YYYY)", () => {
    expect(GroupCreateSchema.safeParse({ ...valid, season: "2025-2026" }).success).toBe(false);
  });

  it("rifiuta stagione in formato errato (mancante il trattino)", () => {
    expect(GroupCreateSchema.safeParse({ ...valid, season: "202526" }).success).toBe(false);
  });

  it("accetta stagione in formato corretto YYYY-YY", () => {
    expect(GroupCreateSchema.safeParse({ ...valid, season: "2024-25" }).success).toBe(true);
  });

  it("rifiuta teamId vuoto", () => {
    const result = GroupCreateSchema.safeParse({ ...valid, teamId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("teamId obbligatorio");
    }
  });

  it("rifiuta teamId mancante", () => {
    const { teamId: _, ...rest } = valid;
    expect(GroupCreateSchema.safeParse(rest).success).toBe(false);
  });

  it("rifiuta championship oltre 200 caratteri", () => {
    expect(
      GroupCreateSchema.safeParse({ ...valid, championship: "x".repeat(201) }).success,
    ).toBe(false);
  });
});

// ─── GroupUpdateSchema ────────────────────────────────────────────────────────

describe("GroupUpdateSchema", () => {
  it("accetta un oggetto vuoto (tutti i campi opzionali)", () => {
    expect(GroupUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accetta aggiornamento solo del nome", () => {
    expect(GroupUpdateSchema.safeParse({ name: "Girone B" }).success).toBe(true);
  });

  it("accetta championship null (reset)", () => {
    expect(GroupUpdateSchema.safeParse({ championship: null }).success).toBe(true);
  });

  it("rifiuta nome vuoto se fornito", () => {
    const result = GroupUpdateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Il nome non può essere vuoto");
    }
  });

  it("rifiuta nome oltre 200 caratteri se fornito", () => {
    expect(GroupUpdateSchema.safeParse({ name: "x".repeat(201) }).success).toBe(false);
  });

  it("rifiuta championship oltre 200 caratteri", () => {
    expect(GroupUpdateSchema.safeParse({ championship: "x".repeat(201) }).success).toBe(false);
  });
});

// ─── GroupMatchCreateSchema ───────────────────────────────────────────────────

describe("GroupMatchCreateSchema", () => {
  const valid = {
    homeTeamId: "team-1",
    awayTeamId: "team-2",
  };

  it("accetta un payload minimo valido (solo le due squadre)", () => {
    expect(GroupMatchCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("accetta un payload completo", () => {
    const full = {
      ...valid,
      matchday: 3,
      date: "2025-10-15T18:00",
      homeScore: 80,
      awayScore: 60,
    };
    expect(GroupMatchCreateSchema.safeParse(full).success).toBe(true);
  });

  it("rifiuta homeTeamId uguale a awayTeamId (refine)", () => {
    const result = GroupMatchCreateSchema.safeParse({ homeTeamId: "team-1", awayTeamId: "team-1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Le squadre devono essere diverse");
    }
  });

  it("rifiuta homeTeamId mancante", () => {
    const { homeTeamId: _, ...rest } = valid;
    expect(GroupMatchCreateSchema.safeParse(rest).success).toBe(false);
  });

  it("rifiuta awayTeamId mancante", () => {
    const { awayTeamId: _, ...rest } = valid;
    expect(GroupMatchCreateSchema.safeParse(rest).success).toBe(false);
  });

  it("rifiuta homeTeamId vuoto", () => {
    expect(GroupMatchCreateSchema.safeParse({ ...valid, homeTeamId: "" }).success).toBe(false);
  });

  it("rifiuta matchday pari a 0 (min 1)", () => {
    expect(GroupMatchCreateSchema.safeParse({ ...valid, matchday: 0 }).success).toBe(false);
  });

  it("accetta matchday null", () => {
    expect(GroupMatchCreateSchema.safeParse({ ...valid, matchday: null }).success).toBe(true);
  });

  it("rifiuta homeScore negativo", () => {
    expect(GroupMatchCreateSchema.safeParse({ ...valid, homeScore: -1 }).success).toBe(false);
  });

  it("accetta homeScore pari a 0", () => {
    expect(GroupMatchCreateSchema.safeParse({ ...valid, homeScore: 0 }).success).toBe(true);
  });

  it("accetta homeScore e awayScore null (partita non ancora disputata)", () => {
    expect(
      GroupMatchCreateSchema.safeParse({ ...valid, homeScore: null, awayScore: null }).success,
    ).toBe(true);
  });
});
