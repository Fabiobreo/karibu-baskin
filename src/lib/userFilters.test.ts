import { describe, it, expect } from "vitest";
import { joinFilter, parseAppRoles, parseSportRoles, sportRoleWhere } from "./userFilters";

describe("parseAppRoles()", () => {
  it("legge piu' ruoli separati da virgola e scarta quelli non validi", () => {
    expect(parseAppRoles("ATHLETE,PARENT,BOH")).toEqual(["ATHLETE", "PARENT"]);
  });

  it("accetta i link vecchi con un solo ruolo", () => {
    expect(parseAppRoles("COACH")).toEqual(["COACH"]);
  });

  it("vuoto o assente: nessun filtro", () => {
    expect(parseAppRoles(undefined)).toEqual([]);
    expect(parseAppRoles("")).toEqual([]);
  });

  it("toglie i doppioni", () => {
    expect(parseAppRoles("ADMIN,ADMIN")).toEqual(["ADMIN"]);
  });
});

describe("parseSportRoles()", () => {
  it("accetta 1-5 e 'none', scarta il resto", () => {
    expect(parseSportRoles("4,5,none,9,x")).toEqual(["4", "5", "none"]);
  });

  it("fa il giro con joinFilter", () => {
    expect(parseSportRoles(joinFilter(["4", "5"]))).toEqual(["4", "5"]);
  });
});

describe("sportRoleWhere()", () => {
  it("nessun valore: nessuna condizione", () => {
    expect(sportRoleWhere([])).toBeNull();
  });

  it("piu' ruoli insieme (es. 4 e 5)", () => {
    expect(sportRoleWhere(["4", "5"])).toEqual({ sportRole: { in: [4, 5] } });
  });

  it("solo senza ruolo", () => {
    expect(sportRoleWhere(["none"])).toEqual({ sportRole: null });
  });

  it("senza ruolo oppure ruolo 1", () => {
    expect(sportRoleWhere(["none", "1"])).toEqual({
      OR: [{ sportRole: null }, { sportRole: { in: [1] } }],
    });
  });
});
