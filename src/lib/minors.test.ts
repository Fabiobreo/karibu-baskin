import { describe, it, expect } from "vitest";
import { adultCutoffDate, isMinor, notMinorFilter } from "./minors";

const NOW = new Date("2026-08-21T12:00:00.000Z");

describe("adultCutoffDate", () => {
  it("è esattamente 18 anni prima di adesso", () => {
    expect(adultCutoffDate(NOW).toISOString()).toBe("2008-08-21T12:00:00.000Z");
  });
});

describe("isMinor", () => {
  it("considera minorenne chi ha meno di 18 anni", () => {
    expect(isMinor(new Date("2012-01-01"), NOW)).toBe(true);
  });

  it("considera maggiorenne chi ne ha più di 18", () => {
    expect(isMinor(new Date("2000-05-10"), NOW)).toBe(false);
  });

  it("considera maggiorenne chi li compie proprio oggi", () => {
    expect(isMinor(new Date("2008-08-21T12:00:00.000Z"), NOW)).toBe(false);
  });

  it("considera minorenne chi li compie domani", () => {
    expect(isMinor(new Date("2008-08-22T12:00:00.000Z"), NOW)).toBe(true);
  });

  it("tratta come adulto chi non ha data di nascita", () => {
    expect(isMinor(null, NOW)).toBe(false);
    expect(isMinor(undefined, NOW)).toBe(false);
  });

  it("accetta anche una data in formato stringa", () => {
    expect(isMinor("2015-03-02", NOW)).toBe(true);
  });

  it("non considera minorenne una data non valida", () => {
    expect(isMinor("non-una-data", NOW)).toBe(false);
  });
});

describe("notMinorFilter", () => {
  it("include chi non ha birthDate e chi è nato entro il cutoff", () => {
    const filter = notMinorFilter(NOW);
    expect(filter).toEqual({
      OR: [{ birthDate: null }, { birthDate: { lte: adultCutoffDate(NOW) } }],
    });
  });
});
