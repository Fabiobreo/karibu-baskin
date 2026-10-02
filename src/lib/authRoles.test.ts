import { describe, it, expect } from "vitest";
import {
  hasRole,
  canManageSessions,
  canRegister,
  canAssignAppRole,
  assignableAppRoles,
  ROLE_HIERARCHY,
} from "./authRoles";
import type { AppRole } from "@prisma/client";

describe("ROLE_HIERARCHY", () => {
  it("la gerarchia è ordinata correttamente", () => {
    expect(ROLE_HIERARCHY.GUEST).toBeLessThan(ROLE_HIERARCHY.ATHLETE);
    expect(ROLE_HIERARCHY.ATHLETE).toBeLessThan(ROLE_HIERARCHY.PARENT);
    expect(ROLE_HIERARCHY.PARENT).toBeLessThan(ROLE_HIERARCHY.COACH);
    expect(ROLE_HIERARCHY.COACH).toBeLessThan(ROLE_HIERARCHY.ADMIN);
  });
});

describe("hasRole", () => {
  it("ADMIN soddisfa qualsiasi ruolo richiesto", () => {
    const roles: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"];
    for (const r of roles) {
      expect(hasRole("ADMIN", r)).toBe(true);
    }
  });

  it("GUEST soddisfa solo GUEST", () => {
    expect(hasRole("GUEST", "GUEST")).toBe(true);
    expect(hasRole("GUEST", "ATHLETE")).toBe(false);
    expect(hasRole("GUEST", "PARENT")).toBe(false);
    expect(hasRole("GUEST", "COACH")).toBe(false);
    expect(hasRole("GUEST", "ADMIN")).toBe(false);
  });

  it("COACH soddisfa GUEST, ATHLETE, PARENT, COACH ma non ADMIN", () => {
    expect(hasRole("COACH", "GUEST")).toBe(true);
    expect(hasRole("COACH", "ATHLETE")).toBe(true);
    expect(hasRole("COACH", "PARENT")).toBe(true);
    expect(hasRole("COACH", "COACH")).toBe(true);
    expect(hasRole("COACH", "ADMIN")).toBe(false);
  });

  it("un ruolo soddisfa sempre sé stesso", () => {
    const roles: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"];
    for (const r of roles) {
      expect(hasRole(r, r)).toBe(true);
    }
  });
});

describe("canManageSessions", () => {
  it("COACH può gestire sessioni", () => {
    expect(canManageSessions("COACH")).toBe(true);
  });

  it("ADMIN può gestire sessioni", () => {
    expect(canManageSessions("ADMIN")).toBe(true);
  });

  it("ATHLETE non può gestire sessioni", () => {
    expect(canManageSessions("ATHLETE")).toBe(false);
  });

  it("PARENT non può gestire sessioni", () => {
    expect(canManageSessions("PARENT")).toBe(false);
  });

  it("GUEST non può gestire sessioni", () => {
    expect(canManageSessions("GUEST")).toBe(false);
  });
});

describe("canRegister", () => {
  it("tutti i ruoli possono registrarsi (GUEST è il minimo)", () => {
    const roles: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"];
    for (const r of roles) {
      expect(canRegister(r)).toBe(true);
    }
  });
});

describe("canAssignAppRole", () => {
  const roles: AppRole[] = ["GUEST", "ATHLETE", "PARENT", "COACH", "ADMIN"];

  it("l'admin assegna qualunque ruolo a un'altra persona", () => {
    for (const current of roles) {
      for (const next of roles) {
        expect(canAssignAppRole({ actorRole: "ADMIN", isSelf: false, current, next })).toBe(true);
      }
    }
  });

  it("nessuno cambia il proprio ruolo, ma può lasciarlo com'è", () => {
    expect(
      canAssignAppRole({ actorRole: "ADMIN", isSelf: true, current: "ADMIN", next: "COACH" })
    ).toBe(false);
    expect(
      canAssignAppRole({ actorRole: "COACH", isSelf: true, current: "COACH", next: "ADMIN" })
    ).toBe(false);
    expect(
      canAssignAppRole({ actorRole: "ADMIN", isSelf: true, current: "ADMIN", next: "ADMIN" })
    ).toBe(true);
  });

  it("l'allenatore approva solo gli ospiti, come atleta o genitore", () => {
    const coach = (current: AppRole, next: AppRole) =>
      canAssignAppRole({ actorRole: "COACH", isSelf: false, current, next });
    expect(coach("GUEST", "ATHLETE")).toBe(true);
    expect(coach("GUEST", "PARENT")).toBe(true);
    expect(coach("GUEST", "COACH")).toBe(false);
    expect(coach("GUEST", "ADMIN")).toBe(false);
    expect(coach("ATHLETE", "PARENT")).toBe(false);
    expect(coach("ATHLETE", "GUEST")).toBe(false);
    expect(coach("PARENT", "ADMIN")).toBe(false);
  });

  it("atleti, genitori e ospiti non assegnano ruoli", () => {
    for (const actorRole of ["GUEST", "ATHLETE", "PARENT"] as AppRole[]) {
      expect(
        canAssignAppRole({ actorRole, isSelf: false, current: "GUEST", next: "ATHLETE" })
      ).toBe(false);
    }
  });
});

describe("assignableAppRoles", () => {
  it("per l'allenatore davanti a un ospite: ospite, atleta, genitore", () => {
    expect(assignableAppRoles({ actorRole: "COACH", isSelf: false, current: "GUEST" })).toEqual([
      "GUEST",
      "ATHLETE",
      "PARENT",
    ]);
  });

  it("per l'allenatore davanti a un tesserato: solo il ruolo che ha", () => {
    expect(assignableAppRoles({ actorRole: "COACH", isSelf: false, current: "PARENT" })).toEqual([
      "PARENT",
    ]);
  });
});
