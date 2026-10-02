import { describe, it, expect } from "vitest";
import { displayLevel, formationStrength } from "./staffLevel";

describe("displayLevel", () => {
  it("arrotonda all'intero", () => {
    expect(displayLevel(26.2)).toBe(26);
    expect(displayLevel(25.5)).toBe(26);
    expect(displayLevel(25)).toBe(25);
  });
});

describe("formationStrength", () => {
  it("è la media dei sei, sulla scala del livello di un giocatore", () => {
    expect(formationStrength(160.3, 6)).toBe(27);
    expect(formationStrength(150, 6)).toBe(25);
  });

  it("non divide per zero", () => {
    expect(formationStrength(0, 0)).toBe(0);
  });
});
