import { describe, it, expect } from "vitest";
import { shootingAccuracy, formatAccuracy } from "./accuracy";

describe("shootingAccuracy", () => {
  it("calcola la percentuale quando i dati sono coerenti", () => {
    expect(shootingAccuracy(0, 10)).toBe(0);
    expect(shootingAccuracy(5, 10)).toBe(50);
    expect(shootingAccuracy(9, 10)).toBe(90);
    expect(shootingAccuracy(10, 10)).toBe(100);
  });

  it("arrotonda all'intero", () => {
    expect(shootingAccuracy(1, 3)).toBe(33);
    expect(shootingAccuracy(2, 3)).toBe(67);
  });

  it("non restituisce nulla senza tiri tentati", () => {
    expect(shootingAccuracy(0, 0)).toBeNull();
    expect(shootingAccuracy(12, 0)).toBeNull();
    expect(shootingAccuracy(3, -2)).toBeNull();
  });

  it("non restituisce mai oltre il 100%: i tentativi sotto i canestri sono un dato incompleto", () => {
    // I due casi reali visti su /marcatori: 123% e 128%.
    expect(shootingAccuracy(37, 30)).toBeNull();
    expect(shootingAccuracy(32, 25)).toBeNull();
    expect(shootingAccuracy(1, 0)).toBeNull();
  });

  it("regge valori non numerici", () => {
    expect(shootingAccuracy(NaN, 10)).toBeNull();
    expect(shootingAccuracy(5, NaN)).toBeNull();
  });
});

describe("formatAccuracy", () => {
  it("formatta col simbolo di percentuale", () => {
    expect(formatAccuracy(5, 10)).toBe("50%");
  });

  it("usa il trattino quando non c'è una percentuale sensata", () => {
    expect(formatAccuracy(0, 0)).toBe("—");
    expect(formatAccuracy(37, 30)).toBe("—");
  });

  it("accetta un fallback personalizzato", () => {
    expect(formatAccuracy(0, 0, "n/d")).toBe("n/d");
  });
});
