import { describe, it, expect } from "vitest";
import { getCurrentSeason, getSeasonStartDate } from "./seasonUtils";

describe("getCurrentSeason()", () => {
  it("agosto → stagione anno precedente (es. ago 2025 → '2024-25')", () => {
    expect(getCurrentSeason(new Date(2025, 7, 31))).toBe("2024-25");
  });

  it("settembre → stagione anno corrente (es. set 2025 → '2025-26')", () => {
    expect(getCurrentSeason(new Date(2025, 8, 1))).toBe("2025-26");
  });

  it("gennaio → stagione anno precedente (es. gen 2026 → '2025-26')", () => {
    expect(getCurrentSeason(new Date(2026, 0, 15))).toBe("2025-26");
  });

  it("dicembre → stagione anno corrente (es. dic 2025 → '2025-26')", () => {
    expect(getCurrentSeason(new Date(2025, 11, 31))).toBe("2025-26");
  });

  it("anno di cambio millennio: set 2099 → '2099-00'", () => {
    expect(getCurrentSeason(new Date(2099, 8, 1))).toBe("2099-00");
  });

  it("accetta stringa ISO come input", () => {
    expect(getCurrentSeason("2025-09-15")).toBe("2025-26");
    expect(getCurrentSeason("2025-08-01")).toBe("2024-25");
  });

  it("la parte breve dell'anno ha sempre 2 cifre", () => {
    const result = getCurrentSeason(new Date(2009, 8, 1));
    expect(result).toBe("2009-10");
  });
});

describe("getSeasonStartDate()", () => {
  it("restituisce il 1° agosto dell'anno corrente a settembre", () => {
    const d = getSeasonStartDate(new Date(2025, 8, 15));
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(1);
  });

  it("restituisce il 1° agosto dell'anno precedente a gennaio", () => {
    const d = getSeasonStartDate(new Date(2026, 0, 20));
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(1);
  });

  it("agosto → usa l'anno corrente (mese >= 7)", () => {
    const d = getSeasonStartDate(new Date(2025, 7, 10));
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(7);
  });

  it("luglio → usa l'anno precedente (mese < 7)", () => {
    const d = getSeasonStartDate(new Date(2025, 6, 31));
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(7);
  });
});
