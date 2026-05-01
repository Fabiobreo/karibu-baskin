import { describe, it, expect } from "vitest";
import {
  RegistrationPostSchema,
  RegistrationPatchSchema,
  TeamMemberSchema,
} from "./registration";

// --- RegistrationPostSchema ---

describe("RegistrationPostSchema", () => {
  const base = { sessionId: "session-1", role: 3 };

  it("accetta un payload minimo valido", () => {
    expect(RegistrationPostSchema.safeParse(base).success).toBe(true);
  });

  it("accetta un payload completo", () => {
    const full = {
      ...base,
      name: "Mario Rossi",
      roleVariant: "5a",
      childId: "child-abc",
      note: "Note sul giocatore",
      anonymousEmail: "mario@example.com",
      registeredAsCoach: false,
    };
    expect(RegistrationPostSchema.safeParse(full).success).toBe(true);
  });

  it("rifiuta sessionId vuoto", () => {
    expect(RegistrationPostSchema.safeParse({ ...base, sessionId: "" }).success).toBe(false);
  });

  it("rifiuta ruolo 0 (fuori range)", () => {
    expect(RegistrationPostSchema.safeParse({ ...base, role: 0 }).success).toBe(false);
  });

  it("rifiuta ruolo 6 (fuori range)", () => {
    expect(RegistrationPostSchema.safeParse({ ...base, role: 6 }).success).toBe(false);
  });

  it("accetta tutti i ruoli validi (1-5)", () => {
    for (const role of [1, 2, 3, 4, 5]) {
      expect(RegistrationPostSchema.safeParse({ ...base, role }).success).toBe(true);
    }
  });

  it("rifiuta ruolo non intero", () => {
    expect(RegistrationPostSchema.safeParse({ ...base, role: 2.5 }).success).toBe(false);
  });

  it("rifiuta name oltre 60 caratteri", () => {
    expect(RegistrationPostSchema.safeParse({ ...base, name: "a".repeat(61) }).success).toBe(false);
  });

  it("accetta name al limite di 60 caratteri", () => {
    expect(RegistrationPostSchema.safeParse({ ...base, name: "a".repeat(60) }).success).toBe(true);
  });

  it("rifiuta note oltre 300 caratteri", () => {
    expect(RegistrationPostSchema.safeParse({ ...base, note: "x".repeat(301) }).success).toBe(false);
  });

  it("accetta note al limite di 300 caratteri", () => {
    expect(RegistrationPostSchema.safeParse({ ...base, note: "x".repeat(300) }).success).toBe(true);
  });

  it("rifiuta anonymousEmail malformata", () => {
    expect(RegistrationPostSchema.safeParse({ ...base, anonymousEmail: "non-email" }).success).toBe(false);
  });

  it("accetta anonymousEmail stringa vuota (rimozione email)", () => {
    expect(RegistrationPostSchema.safeParse({ ...base, anonymousEmail: "" }).success).toBe(true);
  });

  it("rifiuta anonymousEmail oltre 254 caratteri", () => {
    const longEmail = "a".repeat(244) + "@example.com";
    expect(RegistrationPostSchema.safeParse({ ...base, anonymousEmail: longEmail }).success).toBe(false);
  });

  it("rifiuta roleVariant oltre 4 caratteri", () => {
    expect(RegistrationPostSchema.safeParse({ ...base, roleVariant: "12345" }).success).toBe(false);
  });
});

// --- RegistrationPatchSchema ---

describe("RegistrationPatchSchema", () => {
  const base = { ids: ["reg-1", "reg-2"] };

  it("accetta un payload minimo valido (solo ids)", () => {
    expect(RegistrationPatchSchema.safeParse(base).success).toBe(true);
  });

  it("accetta aggiornamento con name, role e anonymousEmail", () => {
    const full = { ...base, name: "Luca Bianchi", role: 2, anonymousEmail: "luca@example.com" };
    expect(RegistrationPatchSchema.safeParse(full).success).toBe(true);
  });

  it("rifiuta ids array vuoto", () => {
    expect(RegistrationPatchSchema.safeParse({ ids: [] }).success).toBe(false);
  });

  it("rifiuta id vuoto nell'array", () => {
    expect(RegistrationPatchSchema.safeParse({ ids: [""] }).success).toBe(false);
  });

  it("rifiuta name vuoto (se fornito)", () => {
    expect(RegistrationPatchSchema.safeParse({ ...base, name: "" }).success).toBe(false);
  });

  it("rifiuta name oltre 60 caratteri", () => {
    expect(RegistrationPatchSchema.safeParse({ ...base, name: "a".repeat(61) }).success).toBe(false);
  });

  it("rifiuta ruolo fuori range", () => {
    expect(RegistrationPatchSchema.safeParse({ ...base, role: 0 }).success).toBe(false);
    expect(RegistrationPatchSchema.safeParse({ ...base, role: 6 }).success).toBe(false);
  });

  it("accetta anonymousEmail null (rimozione email)", () => {
    expect(RegistrationPatchSchema.safeParse({ ...base, anonymousEmail: null }).success).toBe(true);
  });

  it("accetta anonymousEmail stringa vuota", () => {
    expect(RegistrationPatchSchema.safeParse({ ...base, anonymousEmail: "" }).success).toBe(true);
  });

  it("rifiuta anonymousEmail malformata", () => {
    expect(RegistrationPatchSchema.safeParse({ ...base, anonymousEmail: "ciaomondo" }).success).toBe(false);
  });
});

// --- TeamMemberSchema ---

describe("TeamMemberSchema", () => {
  it("accetta solo userId", () => {
    expect(TeamMemberSchema.safeParse({ userId: "user-1" }).success).toBe(true);
  });

  it("accetta solo childId", () => {
    expect(TeamMemberSchema.safeParse({ childId: "child-1" }).success).toBe(true);
  });

  it("rifiuta se entrambi userId e childId sono forniti", () => {
    const result = TeamMemberSchema.safeParse({ userId: "u-1", childId: "c-1" });
    expect(result.success).toBe(false);
  });

  it("rifiuta se nessuno tra userId e childId è fornito", () => {
    const result = TeamMemberSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accetta isCaptain true con userId", () => {
    expect(TeamMemberSchema.safeParse({ userId: "user-1", isCaptain: true }).success).toBe(true);
  });

  it("accetta isCaptain false con childId", () => {
    expect(TeamMemberSchema.safeParse({ childId: "child-1", isCaptain: false }).success).toBe(true);
  });
});
