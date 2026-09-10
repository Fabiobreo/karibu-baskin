import { describe, it, expect } from "vitest";
import {
  adultCutoffDate,
  isMinor,
  isMinorChild,
  notMinorFilter,
  notMinorFilterChild,
} from "./minors";

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

// I Child partono dal presupposto opposto: il record esiste perché l'atleta è
// gestito da un genitore, quindi il dato mancante non prova la maggiore età.
describe("isMinorChild", () => {
  it("senza data di nascita presume minorenne", () => {
    expect(isMinorChild(null, NOW)).toBe(true);
    expect(isMinorChild(undefined, NOW)).toBe(true);
  });

  it("con data di nascita si comporta come isMinor", () => {
    expect(isMinorChild(new Date("2012-01-01"), NOW)).toBe(true);
    expect(isMinorChild(new Date("2000-05-10"), NOW)).toBe(false);
  });

  it("il giorno del diciottesimo compleanno non è più minorenne", () => {
    expect(isMinorChild("2008-08-21T12:00:00.000Z", NOW)).toBe(false);
    expect(isMinorChild("2008-08-22T12:00:00.000Z", NOW)).toBe(true);
  });

  it("una data non valida non rende pubblico il record", () => {
    // isMinor su input non parsabile ritorna false; qui il default deve
    // comunque proteggere, perché una data illeggibile è un dato mancante.
    expect(isMinorChild("non-una-data", NOW)).toBe(true);
  });
});

describe("notMinorFilterChild", () => {
  it("esclude i record senza birthDate", () => {
    expect(notMinorFilterChild(NOW)).toEqual({
      birthDate: { not: null, lte: adultCutoffDate(NOW) },
    });
  });

  it("non è il filtro degli User: quello include i null", () => {
    expect(notMinorFilterChild(NOW)).not.toEqual(notMinorFilter(NOW));
  });
});
