import { describe, it, expect } from "vitest";
import { MeUpdateSchema, PersonNameSchema } from "./me";

describe("PersonNameSchema", () => {
  it("ripulisce gli spazi", () => {
    expect(PersonNameSchema.parse("  Mario   Rossi ")).toBe("Mario Rossi");
  });

  it("rifiuta nomi vuoti o di un carattere", () => {
    expect(PersonNameSchema.safeParse("   ").success).toBe(false);
    expect(PersonNameSchema.safeParse("M").success).toBe(false);
  });

  it("rifiuta nomi oltre 60 caratteri", () => {
    expect(PersonNameSchema.safeParse("a".repeat(61)).success).toBe(false);
  });
});

describe("MeUpdateSchema", () => {
  it("accetta solo il nome, solo la foto o nessuno dei due", () => {
    expect(MeUpdateSchema.safeParse({ name: "Anna Bianchi" }).success).toBe(true);
    expect(MeUpdateSchema.safeParse({ customImage: null }).success).toBe(true);
    expect(MeUpdateSchema.safeParse({}).success).toBe(true);
  });
});
