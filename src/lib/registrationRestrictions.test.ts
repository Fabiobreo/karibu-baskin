import { describe, it, expect } from "vitest";
import {
  checkRegistrationAllowed,
  hasRestrictions,
  isRoleOpenForAll,
  type SessionRestrictions,
} from "./registrationRestrictions";

const noRestrictions: SessionRestrictions = {
  allowedRoles: [],
  restrictTeamId: null,
  openRoles: [],
};

const roleRestriction: SessionRestrictions = {
  allowedRoles: [3, 4, 5],
  restrictTeamId: null,
  openRoles: [],
};

const teamRestriction: SessionRestrictions = {
  allowedRoles: [],
  restrictTeamId: "team-123",
  openRoles: [],
};

const teamRestrictionWithOpenRoles: SessionRestrictions = {
  allowedRoles: [],
  restrictTeamId: "team-123",
  openRoles: [1],
};

const fullRestriction: SessionRestrictions = {
  allowedRoles: [3, 4, 5],
  restrictTeamId: "team-123",
  openRoles: [1],
};

// ─── hasRestrictions ──────────────────────────────────────────────────────────

describe("hasRestrictions", () => {
  it("restituisce false quando non ci sono restrizioni", () => {
    expect(hasRestrictions(noRestrictions)).toBe(false);
  });

  it("restituisce true quando ci sono allowedRoles", () => {
    expect(hasRestrictions(roleRestriction)).toBe(true);
  });

  it("restituisce true quando c'è restrictTeamId", () => {
    expect(hasRestrictions(teamRestriction)).toBe(true);
  });

  it("restituisce true quando ci sono entrambe le restrizioni", () => {
    expect(hasRestrictions(fullRestriction)).toBe(true);
  });
});

// ─── isRoleOpenForAll ─────────────────────────────────────────────────────────

describe("isRoleOpenForAll", () => {
  it("restituisce true se il ruolo è nella lista openRoles", () => {
    expect(isRoleOpenForAll(teamRestrictionWithOpenRoles, 1)).toBe(true);
  });

  it("restituisce false se il ruolo non è nella lista openRoles", () => {
    expect(isRoleOpenForAll(teamRestrictionWithOpenRoles, 2)).toBe(false);
  });

  it("restituisce false se openRoles è vuota", () => {
    expect(isRoleOpenForAll(noRestrictions, 1)).toBe(false);
  });
});

// ─── checkRegistrationAllowed ─────────────────────────────────────────────────

describe("checkRegistrationAllowed — ADMIN", () => {
  it("ADMIN è sempre ammesso, anche con restrizioni totali", () => {
    expect(checkRegistrationAllowed(fullRestriction, "ADMIN", 2, false)).toEqual({ allowed: true });
  });

  it("ADMIN è ammesso anche con ruolo non valido", () => {
    expect(checkRegistrationAllowed(roleRestriction, "ADMIN", 1, false)).toEqual({ allowed: true });
  });
});

describe("checkRegistrationAllowed — GUEST", () => {
  it("GUEST è sempre ammesso senza restrizioni", () => {
    expect(checkRegistrationAllowed(noRestrictions, "GUEST", 1, false)).toEqual({ allowed: true });
  });

  it("GUEST è ammesso anche con restrizioni team", () => {
    expect(checkRegistrationAllowed(teamRestriction, "GUEST", 3, false)).toEqual({ allowed: true });
  });

  it("GUEST è ammesso anche con restrizioni ruolo", () => {
    expect(checkRegistrationAllowed(roleRestriction, "GUEST", 1, false)).toEqual({ allowed: true });
  });
});

describe("checkRegistrationAllowed — coach che si iscrive come allenatore", () => {
  it("registeredAsCoach=true bypassa tutte le restrizioni", () => {
    expect(checkRegistrationAllowed(fullRestriction, "COACH", 2, false, true)).toEqual({ allowed: true });
  });
});

describe("checkRegistrationAllowed — nessuna restrizione", () => {
  it("ATHLETE ammesso senza restrizioni", () => {
    expect(checkRegistrationAllowed(noRestrictions, "ATHLETE", 3, false)).toEqual({ allowed: true });
  });

  it("PARENT ammesso senza restrizioni", () => {
    expect(checkRegistrationAllowed(noRestrictions, "PARENT", 1, false)).toEqual({ allowed: true });
  });

  it("anonimo (null) ammesso senza restrizioni", () => {
    expect(checkRegistrationAllowed(noRestrictions, null, 2, false)).toEqual({ allowed: true });
  });
});

describe("checkRegistrationAllowed — restrizione per ruolo sportivo", () => {
  it("ruolo ammesso nella lista → allowed", () => {
    expect(checkRegistrationAllowed(roleRestriction, "ATHLETE", 3, false)).toEqual({ allowed: true });
  });

  it("ruolo non ammesso → blocked con reason", () => {
    const result = checkRegistrationAllowed(roleRestriction, "ATHLETE", 1, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/ruoli/i);
  });

  it("ruolo non ammesso per PARENT → blocked", () => {
    const result = checkRegistrationAllowed(roleRestriction, "PARENT", 2, false);
    expect(result.allowed).toBe(false);
  });
});

describe("checkRegistrationAllowed — restrizione per squadra", () => {
  it("membro della squadra ristretta → allowed", () => {
    expect(checkRegistrationAllowed(teamRestriction, "ATHLETE", 3, true)).toEqual({ allowed: true });
  });

  it("non membro della squadra ristretta → blocked con reason", () => {
    const result = checkRegistrationAllowed(teamRestriction, "ATHLETE", 3, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/squadra/i);
  });

  it("ruolo aperto bypassa la restrizione di squadra (non membro)", () => {
    expect(checkRegistrationAllowed(teamRestrictionWithOpenRoles, "ATHLETE", 1, false)).toEqual({ allowed: true });
  });

  it("ruolo non aperto non bypassa la restrizione di squadra", () => {
    const result = checkRegistrationAllowed(teamRestrictionWithOpenRoles, "ATHLETE", 2, false);
    expect(result.allowed).toBe(false);
  });
});

describe("checkRegistrationAllowed — restrizioni combinate (ruolo + squadra)", () => {
  it("ruolo ammesso + membro squadra → allowed", () => {
    expect(checkRegistrationAllowed(fullRestriction, "ATHLETE", 3, true)).toEqual({ allowed: true });
  });

  it("ruolo ammesso + non membro squadra + ruolo non aperto → blocked per squadra", () => {
    const result = checkRegistrationAllowed(fullRestriction, "ATHLETE", 3, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/squadra/i);
  });

  it("ruolo ammesso + non membro squadra + ruolo aperto → allowed", () => {
    // fullRestriction ha openRoles=[1] e allowedRoles=[3,4,5]: ruolo 1 non passa allowedRoles
    // → blocked per ruolo, non arriva al check squadra
    const result = checkRegistrationAllowed(fullRestriction, "ATHLETE", 1, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/ruoli/i);
  });

  it("ruolo non ammesso → blocked prima ancora del check squadra", () => {
    const result = checkRegistrationAllowed(fullRestriction, "ATHLETE", 2, true);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/ruoli/i);
  });
});
