import { describe, it, expect } from "vitest";
import { ChildCreateSchema, ChildPatchSchema } from "./child";

// ─── ChildCreateSchema ────────────────────────────────────────────────────────

describe("ChildCreateSchema", () => {
  const C = { parentalConsent: true as const };

  it("accetta un payload minimo valido (nome + consenso)", () => {
    expect(ChildCreateSchema.safeParse({ name: "Marco Rossi", ...C }).success).toBe(true);
  });

  it("accetta un payload completo", () => {
    const full = {
      name: "Marco Rossi",
      sportRole: 3,
      sportRoleVariant: "A",
      gender: "MALE",
      birthDate: "2010-05-20",
      ...C,
    };
    expect(ChildCreateSchema.safeParse(full).success).toBe(true);
  });

  it("rifiuta payload senza parentalConsent", () => {
    expect(ChildCreateSchema.safeParse({ name: "Marco Rossi" }).success).toBe(false);
  });

  it("rifiuta parentalConsent false", () => {
    expect(
      ChildCreateSchema.safeParse({ name: "Marco Rossi", parentalConsent: false }).success
    ).toBe(false);
  });

  it("rifiuta nome vuoto", () => {
    const result = ChildCreateSchema.safeParse({ name: "", ...C });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Il nome è obbligatorio");
    }
  });

  it("rifiuta nome oltre 60 caratteri", () => {
    expect(ChildCreateSchema.safeParse({ name: "x".repeat(61), ...C }).success).toBe(false);
  });

  it("rifiuta nome mancante", () => {
    expect(ChildCreateSchema.safeParse({ ...C }).success).toBe(false);
  });

  it("rifiuta sportRole fuori range (0)", () => {
    expect(ChildCreateSchema.safeParse({ name: "Marco", sportRole: 0, ...C }).success).toBe(false);
  });

  it("rifiuta sportRole fuori range (6)", () => {
    expect(ChildCreateSchema.safeParse({ name: "Marco", sportRole: 6, ...C }).success).toBe(false);
  });

  it("accetta sportRole nel range 1-5", () => {
    for (const r of [1, 2, 3, 4, 5]) {
      expect(ChildCreateSchema.safeParse({ name: "Marco", sportRole: r, ...C }).success).toBe(true);
    }
  });

  it("accetta sportRole null", () => {
    expect(ChildCreateSchema.safeParse({ name: "Marco", sportRole: null, ...C }).success).toBe(
      true
    );
  });

  it("rifiuta sportRole non intero", () => {
    expect(ChildCreateSchema.safeParse({ name: "Marco", sportRole: 2.5, ...C }).success).toBe(
      false
    );
  });

  it("accetta gender MALE e FEMALE", () => {
    expect(ChildCreateSchema.safeParse({ name: "Marco", gender: "MALE", ...C }).success).toBe(true);
    expect(ChildCreateSchema.safeParse({ name: "Marco", gender: "FEMALE", ...C }).success).toBe(
      true
    );
  });

  it("rifiuta gender non riconosciuto", () => {
    expect(ChildCreateSchema.safeParse({ name: "Marco", gender: "OTHER", ...C }).success).toBe(
      false
    );
  });

  it("accetta gender null", () => {
    expect(ChildCreateSchema.safeParse({ name: "Marco", gender: null, ...C }).success).toBe(true);
  });

  it("rifiuta sportRoleVariant oltre 50 caratteri", () => {
    expect(
      ChildCreateSchema.safeParse({ name: "Marco", sportRoleVariant: "x".repeat(51), ...C }).success
    ).toBe(false);
  });
});

// ─── ChildPatchSchema ─────────────────────────────────────────────────────────

describe("ChildPatchSchema", () => {
  it("accetta un oggetto vuoto (tutti i campi opzionali)", () => {
    expect(ChildPatchSchema.safeParse({}).success).toBe(true);
  });

  it("accetta aggiornamento solo del nome", () => {
    expect(ChildPatchSchema.safeParse({ name: "Luca Bianchi" }).success).toBe(true);
  });

  it("rifiuta nome vuoto se fornito", () => {
    const result = ChildPatchSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Il nome non può essere vuoto");
    }
  });

  it("accetta linkEmail valida", () => {
    expect(ChildPatchSchema.safeParse({ linkEmail: "genitore@example.com" }).success).toBe(true);
  });

  it("rifiuta linkEmail non valida", () => {
    const result = ChildPatchSchema.safeParse({ linkEmail: "non-una-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Email non valida");
    }
  });

  it("accetta unlinkAccount true/false", () => {
    expect(ChildPatchSchema.safeParse({ unlinkAccount: true }).success).toBe(true);
    expect(ChildPatchSchema.safeParse({ unlinkAccount: false }).success).toBe(true);
  });

  it("accetta sportRole null (reset ruolo)", () => {
    expect(ChildPatchSchema.safeParse({ sportRole: null }).success).toBe(true);
  });

  it("accetta gender null (reset genere)", () => {
    expect(ChildPatchSchema.safeParse({ gender: null }).success).toBe(true);
  });
});
