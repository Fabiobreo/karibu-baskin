import { describe, it, expect } from "vitest";
import { hasStarted, isHistoricMatch, matchPhase, showWhereWhen } from "./matchPhase";

// Sabato 4 ottobre 2026, 15:00 a Roma = 13:00 UTC
const start = new Date("2026-10-04T13:00:00Z");
const at = (iso: string) => new Date(iso).getTime();

describe("matchPhase", () => {
  it("con il punteggio è giocata, a prescindere dall'ora", () => {
    expect(matchPhase(start, true, at("2026-10-01T10:00:00Z"))).toBe("played");
  });
  it("prima dell'inizio è futura", () => {
    expect(matchPhase(start, false, at("2026-10-04T12:59:00Z"))).toBe("upcoming");
  });
  it("fino a 3 ore dall'inizio è in corso", () => {
    expect(matchPhase(start, false, at("2026-10-04T13:00:00Z"))).toBe("live");
    expect(matchPhase(start, false, at("2026-10-04T15:59:00Z"))).toBe("live");
  });
  it("dopo 3 ore senza punteggio il risultato è in arrivo", () => {
    expect(matchPhase(start, false, at("2026-10-04T16:00:00Z"))).toBe("awaitingResult");
    expect(matchPhase(start, false, at("2026-10-09T10:00:00Z"))).toBe("awaitingResult");
  });
});

describe("hasStarted", () => {
  it("è falsa prima dell'inizio, vera dall'inizio in poi", () => {
    expect(hasStarted(start, at("2026-10-04T12:59:00Z"))).toBe(false);
    expect(hasStarted(start, at("2026-10-04T13:00:00Z"))).toBe(true);
    expect(hasStarted(start, at("2027-03-01T10:00:00Z"))).toBe(true);
  });
  it("con una data non valida la partita non è iniziata", () => {
    expect(hasStarted("boh", at("2026-10-04T13:00:00Z"))).toBe(false);
  });
});

describe("isHistoricMatch", () => {
  it("è storico solo oltre un mese dalla partita", () => {
    expect(isHistoricMatch(start, at("2026-09-20T10:00:00Z"))).toBe(false);
    expect(isHistoricMatch(start, at("2026-10-05T10:00:00Z"))).toBe(false);
    expect(isHistoricMatch(start, at("2026-11-03T13:00:00Z"))).toBe(false);
    expect(isHistoricMatch(start, at("2026-11-03T13:00:01Z"))).toBe(true);
  });
  it("con una data non valida non è storico", () => {
    expect(isHistoricMatch("boh", at("2026-10-04T13:00:00Z"))).toBe(false);
  });
});

describe("showWhereWhen", () => {
  it("c'è prima della partita e per tutto il suo giorno (ora di Roma)", () => {
    expect(showWhereWhen(start, "upcoming", at("2026-09-20T10:00:00Z"))).toBe(true);
    expect(showWhereWhen(start, "live", at("2026-10-04T14:00:00Z"))).toBe(true);
    // 23:30 a Roma, ancora sabato
    expect(showWhereWhen(start, "awaitingResult", at("2026-10-04T21:30:00Z"))).toBe(true);
  });
  it("sparisce il giorno dopo e quando la partita è giocata", () => {
    // 00:30 di domenica a Roma
    expect(showWhereWhen(start, "awaitingResult", at("2026-10-04T22:30:00Z"))).toBe(false);
    expect(showWhereWhen(start, "played", at("2026-10-04T14:00:00Z"))).toBe(false);
  });
});
