import { describe, it, expect } from "vitest";
import { parseCalendarRange } from "./calendarRange";

const params = (q: string) => new URLSearchParams(q);

describe("parseCalendarRange()", () => {
  it("usa from/to quando sono validi", () => {
    // Griglia di ottobre 2026: da lunedì 28 settembre a lunedì 9 novembre (escluso).
    const r = parseCalendarRange(
      params("from=2026-09-27T22:00:00.000Z&to=2026-11-08T23:00:00.000Z")
    );
    expect(r.from.toISOString()).toBe("2026-09-27T22:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-11-08T23:00:00.000Z");
  });

  it("calcola il mese nel fuso di Roma, non in UTC", () => {
    const r = parseCalendarRange(params("month=2026-10"));
    expect(r.from.toISOString()).toBe("2026-09-30T22:00:00.000Z"); // 1 ottobre, ora legale
    expect(r.to.toISOString()).toBe("2026-10-31T23:00:00.000Z"); // 1 novembre, ora solare
  });

  it("gestisce il passaggio d'anno", () => {
    const r = parseCalendarRange(params("month=2026-12"));
    expect(r.from.toISOString()).toBe("2026-11-30T23:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-12-31T23:00:00.000Z");
  });

  it("ricade sul mese se l'intervallo è troppo lungo", () => {
    const r = parseCalendarRange(
      params("from=2026-01-01T00:00:00Z&to=2026-12-31T00:00:00Z&month=2026-10")
    );
    expect(r.from.toISOString()).toBe("2026-09-30T22:00:00.000Z");
  });

  it("ricade sul mese se to non è dopo from", () => {
    const r = parseCalendarRange(
      params("from=2026-10-10T00:00:00Z&to=2026-10-01T00:00:00Z&month=2026-10")
    );
    expect(r.from.toISOString()).toBe("2026-09-30T22:00:00.000Z");
  });

  it("rifiuta date senza fuso", () => {
    const r = parseCalendarRange(params("from=2026-10-01T00:00&to=2026-10-20T00:00&month=2026-10"));
    expect(r.from.toISOString()).toBe("2026-09-30T22:00:00.000Z");
  });

  it("usa il mese corrente di Roma senza parametri validi", () => {
    // 30 settembre, 23:30 UTC = 1 ottobre, 01:30 a Roma
    const now = new Date("2026-09-30T23:30:00Z");
    const r = parseCalendarRange(params("month=luglio"), now);
    expect(r.from.toISOString()).toBe("2026-09-30T22:00:00.000Z");
  });
});
