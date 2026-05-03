import { describe, it, expect } from "vitest";
import { SessionCreateSchema, SessionUpdateSchema } from "./session";

const validCreate = {
  title: "Allenamento martedì",
  date: "2025-09-16T19:00",
};

describe("SessionCreateSchema", () => {
  it("accetta un payload minimo valido", () => {
    expect(SessionCreateSchema.safeParse(validCreate).success).toBe(true);
  });

  it("accetta un payload completo", () => {
    const full = {
      ...validCreate,
      endTime: "2025-09-16T21:00",
      dateSlug: "2025-09-16",
      allowedRoles: [1, 2, 3],
      restrictTeamId: "team-abc",
      openRoles: [1],
    };
    expect(SessionCreateSchema.safeParse(full).success).toBe(true);
  });

  it("rifiuta titolo vuoto", () => {
    const result = SessionCreateSchema.safeParse({ ...validCreate, title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Titolo obbligatorio");
    }
  });

  it("rifiuta titolo oltre 200 caratteri", () => {
    const result = SessionCreateSchema.safeParse({ ...validCreate, title: "x".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rifiuta data vuota", () => {
    const result = SessionCreateSchema.safeParse({ ...validCreate, date: "" });
    expect(result.success).toBe(false);
  });

  it("rifiuta allowedRoles fuori range (0, 6)", () => {
    expect(SessionCreateSchema.safeParse({ ...validCreate, allowedRoles: [0] }).success).toBe(false);
    expect(SessionCreateSchema.safeParse({ ...validCreate, allowedRoles: [6] }).success).toBe(false);
  });

  it("accetta allowedRoles validi (1-5)", () => {
    expect(SessionCreateSchema.safeParse({ ...validCreate, allowedRoles: [1, 2, 3, 4, 5] }).success).toBe(true);
  });

  it("accetta restrictTeamId null", () => {
    expect(SessionCreateSchema.safeParse({ ...validCreate, restrictTeamId: null }).success).toBe(true);
  });

  it("rifiuta allowedRoles con numeri non interi", () => {
    expect(SessionCreateSchema.safeParse({ ...validCreate, allowedRoles: [1.5] }).success).toBe(false);
  });
});

describe("SessionUpdateSchema", () => {
  it("accetta un oggetto vuoto (tutti i campi opzionali)", () => {
    expect(SessionUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accetta aggiornamento parziale con solo il titolo", () => {
    expect(SessionUpdateSchema.safeParse({ title: "Nuovo titolo" }).success).toBe(true);
  });

  it("rifiuta titolo vuoto (se fornito)", () => {
    const result = SessionUpdateSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("rifiuta titolo oltre 200 caratteri (se fornito)", () => {
    expect(SessionUpdateSchema.safeParse({ title: "x".repeat(201) }).success).toBe(false);
  });

  it("accetta endTime null (rimozione orario fine)", () => {
    expect(SessionUpdateSchema.safeParse({ endTime: null }).success).toBe(true);
  });

  it("accetta restrictTeamId null (rimozione restrizione squadra)", () => {
    expect(SessionUpdateSchema.safeParse({ restrictTeamId: null }).success).toBe(true);
  });

  it("rifiuta openRoles fuori range", () => {
    expect(SessionUpdateSchema.safeParse({ openRoles: [0] }).success).toBe(false);
    expect(SessionUpdateSchema.safeParse({ openRoles: [6] }).success).toBe(false);
  });
});
