import { describe, expect, it } from "vitest";
import { attendanceChanges, closeStatus, expectedMatchups, resultOps } from "./trainingClose";

describe("expectedMatchups", () => {
  it("una partitella con due squadre, tre con tre, nessuna senza squadre", () => {
    expect(expectedMatchups(2)).toEqual(["AB"]);
    expect(expectedMatchups(3)).toEqual(["AB", "AC", "BC"]);
    expect(expectedMatchups(0)).toEqual([]);
  });
});

describe("attendanceChanges", () => {
  const athletes = [
    { id: "a", attended: null },
    { id: "b", attended: true },
    { id: "c", attended: false },
  ];
  it("manda solo cio' che e' cambiato", () => {
    expect(attendanceChanges(athletes, { a: true, b: true, c: null })).toEqual([
      { regId: "a", attended: true },
      { regId: "c", attended: null },
    ]);
  });
  it("niente da salvare senza modifiche", () => {
    expect(attendanceChanges(athletes, {})).toEqual([]);
  });
});

describe("resultOps", () => {
  const saved = [{ id: "r1", matchup: "AB", scoreA: 10, scoreB: 8 }];
  it("crea, aggiorna e cancella", () => {
    const ops = resultOps(["AB", "AC", "BC"], saved, {
      AB: { a: "", b: "" },
      AC: { a: "12", b: "9" },
    });
    expect(ops.remove).toEqual([{ id: "r1", matchup: "AB" }]);
    expect(ops.create).toEqual([{ matchup: "AC", scoreA: 12, scoreB: 9 }]);
    expect(ops.update).toEqual([]);
  });
  it("aggiorna solo se il punteggio cambia", () => {
    expect(resultOps(["AB"], saved, { AB: { a: "10", b: "8" } }).update).toEqual([]);
    expect(resultOps(["AB"], saved, { AB: { a: "11", b: "8" } }).update).toEqual([
      { id: "r1", matchup: "AB", scoreA: 11, scoreB: 8 },
    ]);
  });
  it("segnala un punteggio a meta' o non numerico", () => {
    expect(
      resultOps(["AB", "AC"], [], { AB: { a: "5", b: "" }, AC: { a: "x", b: "3" } }).invalid
    ).toEqual(["AB", "AC"]);
  });
});

describe("closeStatus", () => {
  it("conta presenze da segnare e risultati mancanti", () => {
    expect(closeStatus([{ attended: null }, { attended: true }], 3, 1)).toEqual({
      unmarked: 1,
      missingResults: 2,
    });
  });
});
