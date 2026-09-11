import { describe, it, expect } from "vitest";
import { isMinorSubject, publicSubjects } from "./minors";
import { isMemberRole } from "./authRoles";

/**
 * Regola delle superfici pubbliche: chi non è tesserato non vede i minori, e
 * nessuno riceve la data di nascita, che serve solo a decidere.
 */

const NOW = new Date("2026-09-11T12:00:00.000Z");

const adultUser = {
  id: "u1",
  user: { name: "Adulto", birthDate: new Date("1990-01-01") },
  child: null,
};
const minorUser = {
  id: "u2",
  user: { name: "Minore", birthDate: new Date("2012-05-05") },
  child: null,
};
const userNoDate = { id: "u3", user: { name: "Senza data", birthDate: null }, child: null };
const childNoDate = { id: "c1", user: null, child: { name: "Figlio", birthDate: null } };
const adultChild = {
  id: "c2",
  user: null,
  child: { name: "Figlio adulto", birthDate: "2000-02-02" },
};

describe("isMemberRole", () => {
  it.each(["ATHLETE", "PARENT", "COACH", "ADMIN"])("%s è un tesserato", (role) => {
    expect(isMemberRole(role)).toBe(true);
  });

  it("un GUEST non è un tesserato: il login è aperto a qualunque account Google", () => {
    expect(isMemberRole("GUEST")).toBe(false);
  });

  it.each([null, undefined, "", "SUPERADMIN"])("%s non è un tesserato", (role) => {
    expect(isMemberRole(role)).toBe(false);
  });
});

describe("isMinorSubject", () => {
  it("applica agli User la regola degli account (senza data = adulto)", () => {
    expect(isMinorSubject(adultUser, NOW)).toBe(false);
    expect(isMinorSubject(minorUser, NOW)).toBe(true);
    expect(isMinorSubject(userNoDate, NOW)).toBe(false);
  });

  it("applica ai Child la regola dei figli (senza data = minore)", () => {
    expect(isMinorSubject(childNoDate, NOW)).toBe(true);
    expect(isMinorSubject(adultChild, NOW)).toBe(false);
  });
});

describe("publicSubjects", () => {
  const all = [adultUser, minorUser, userNoDate, childNoDate, adultChild];

  it("per chi non è tesserato toglie i minori", () => {
    const ids = publicSubjects(all, false, NOW).map((s) => s.id);
    expect(ids).toEqual(["u1", "u3", "c2"]);
  });

  it("per un tesserato mostra tutti", () => {
    expect(publicSubjects(all, true, NOW)).toHaveLength(all.length);
  });

  it("toglie sempre la data di nascita, anche agli adulti e ai tesserati", () => {
    for (const member of [true, false]) {
      for (const s of publicSubjects(all, member, NOW)) {
        expect(s.user ?? {}).not.toHaveProperty("birthDate");
        expect(s.child ?? {}).not.toHaveProperty("birthDate");
      }
    }
  });

  it("non modifica gli oggetti originali", () => {
    publicSubjects(all, false, NOW);
    expect(adultUser.user.birthDate).toBeInstanceOf(Date);
  });

  it("conserva il resto dei campi", () => {
    const [first] = publicSubjects([adultUser], false, NOW);
    expect(first.user).toEqual({ name: "Adulto" });
    expect(first.id).toBe("u1");
  });
});
