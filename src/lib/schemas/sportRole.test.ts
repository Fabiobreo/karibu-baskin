import { describe, it, expect } from "vitest";
import { SportRoleSuggestionSchema } from "./sportRole";

describe("SportRoleSuggestionSchema", () => {
  it("accetta un ruolo senza variante", () => {
    expect(SportRoleSuggestionSchema.safeParse({ role: 3 }).success).toBe(true);
  });

  it("accetta una variante nota", () => {
    expect(SportRoleSuggestionSchema.safeParse({ role: 2, variant: "T" }).success).toBe(true);
    expect(SportRoleSuggestionSchema.safeParse({ role: 2, variant: null }).success).toBe(true);
  });

  it("rifiuta ruoli fuori da 1-5", () => {
    expect(SportRoleSuggestionSchema.safeParse({ role: 0 }).success).toBe(false);
    expect(SportRoleSuggestionSchema.safeParse({ role: 6 }).success).toBe(false);
    expect(SportRoleSuggestionSchema.safeParse({ role: 2.5 }).success).toBe(false);
  });

  it("rifiuta varianti sconosciute", () => {
    expect(SportRoleSuggestionSchema.safeParse({ role: 2, variant: "X" }).success).toBe(false);
  });
});
