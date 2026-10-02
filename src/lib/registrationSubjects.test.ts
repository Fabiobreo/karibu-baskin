import { describe, it, expect } from "vitest";
import { splitOwnChild } from "./registrationSubjects";

const luca = { id: "c-luca", userId: null };
const sofia = { id: "c-sofia", userId: "u-sofia" };
const own = { id: "c-me", userId: "u-me" };

describe("splitOwnChild()", () => {
  it("senza una scheda propria restano tutti i figli", () => {
    expect(splitOwnChild([luca, sofia], "u-me")).toEqual({ own: null, others: [luca, sofia] });
  });

  it("la scheda collegata al proprio account non è un figlio", () => {
    expect(splitOwnChild([luca, own, sofia], "u-me")).toEqual({ own, others: [luca, sofia] });
  });

  it("riconosce la scheda propria anche dal solo linkedChildId", () => {
    const unlinked = { id: "c-me", userId: null };
    expect(splitOwnChild([unlinked, luca], "u-me", "c-me")).toEqual({
      own: unlinked,
      others: [luca],
    });
  });

  it("senza account (anonimo) non toglie niente, nemmeno le schede senza account", () => {
    expect(splitOwnChild([luca], null)).toEqual({ own: null, others: [luca] });
  });

  it("l'unico figlio è la propria scheda: nessun altro fra cui scegliere", () => {
    expect(splitOwnChild([own], "u-me").others).toEqual([]);
  });
});
