import { describe, expect, it } from "vitest";
import { childLinkedAccounts, groupFamilies } from "./familyLinks";

const families = (map: Map<string, string>) => new Set(map.values()).size;

describe("groupFamilies", () => {
  it("due genitori e un figlio con account sono una famiglia sola", () => {
    const map = groupFamilies(
      ["mamma", "papa", "figlio"],
      [{ userId: "figlio", guardians: [{ userId: "mamma" }, { userId: "papa" }] }]
    );
    expect(families(map)).toBe(1);
    expect(map.get("mamma")).toBe(map.get("figlio"));
    expect(map.get("papa")).toBe(map.get("figlio"));
  });

  it("un tesserato senza legami è una famiglia da solo", () => {
    expect(families(groupFamilies(["a", "b"], []))).toBe(2);
  });

  it("fratelli con genitori in comune restano una famiglia", () => {
    const map = groupFamilies(
      ["mamma", "papa"],
      [
        { userId: null, guardians: [{ userId: "mamma" }] },
        { userId: null, guardians: [{ userId: "mamma" }, { userId: "papa" }] },
      ]
    );
    expect(families(map)).toBe(1);
  });

  it("ignora gli account fuori elenco (ospiti) senza che facciano da ponte", () => {
    const map = groupFamilies(
      ["a", "b"],
      [
        { userId: null, guardians: [{ userId: "a" }, { userId: "ospite" }] },
        { userId: null, guardians: [{ userId: "ospite" }, { userId: "b" }] },
      ]
    );
    expect(families(map)).toBe(2);
    expect(map.has("ospite")).toBe(false);
  });
});

describe("childLinkedAccounts", () => {
  it("genitori più l'account del figlio", () => {
    expect(childLinkedAccounts({ userId: "f", guardians: [{ userId: "g" }] })).toEqual(["g", "f"]);
  });
});
