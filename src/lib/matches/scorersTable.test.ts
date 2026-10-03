import { describe, expect, it } from "vitest";
import {
  columnTotal,
  filterScorers,
  filtersButtonLabel,
  hasAnyLoan,
  matchesLoanNote,
  sortScorers,
  type PlayerStatRow,
} from "./scorersTable";

function row(over: Partial<PlayerStatRow> = {}): PlayerStatRow {
  return {
    id: "p",
    kind: "user",
    name: "Anna",
    image: null,
    slug: null,
    sportRole: 3,
    sportRoleVariant: null,
    matches: 5,
    points: 40,
    twoPointers: 10,
    threePointers: 4,
    freeThrows: 8,
    fouls: 3,
    illegalFouls: 0,
    shotsAttempted: 30,
    mvpCount: 1,
    teams: [],
    loanMatches: 0,
    loanPoints: 0,
    loanTwoPointers: 0,
    loanThreePointers: 0,
    loanFreeThrows: 0,
    loanFouls: 0,
    loanIllegalFouls: 0,
    loanShotsAttempted: 0,
    ...over,
  };
}

const loanText = (n: number) => `${n} in prestito`;

describe("filtersButtonLabel", () => {
  it("senza filtro dice solo Filtri", () => {
    expect(filtersButtonLabel("Filtri", null)).toBe("Filtri");
  });
  it("con un ruolo scelto lo aggiunge", () => {
    expect(filtersButtonLabel("Filtri", "Ruolo 3")).toBe("Filtri · Ruolo 3");
  });
});

describe("matchesLoanNote", () => {
  it("niente nota senza prestiti", () => {
    expect(matchesLoanNote(row(), loanText)).toBeNull();
  });
  it("conta solo le partite in prestito", () => {
    expect(matchesLoanNote(row({ loanMatches: 2, loanPoints: 14 }), loanText)).toBe(
      "2 in prestito"
    );
  });
});

describe("columnTotal", () => {
  it("somma parte propria e prestito", () => {
    const r = row({ loanMatches: 2, loanPoints: 10 });
    expect(columnTotal(r, "matches")).toBe(7);
    expect(columnTotal(r, "points")).toBe(50);
    expect(columnTotal(r, "avgPoints")).toBeCloseTo(50 / 7);
  });
  it("percentuale non valida vale 0 per l'ordinamento", () => {
    expect(columnTotal(row({ shotsAttempted: 5 }), "accuracy")).toBe(0);
    expect(columnTotal(row(), "accuracy")).toBe(Math.round((22 / 30) * 100));
  });
  it("una partita senza partite ha media 0", () => {
    expect(columnTotal(row({ matches: 0, points: 0 }), "avgPoints")).toBe(0);
  });
});

describe("sortScorers / filterScorers", () => {
  const a = row({ id: "a", name: "Anna", points: 10, sportRole: 1 });
  const b = row({ id: "b", name: "Bruno", points: 30, sportRole: 3 });
  const c = row({ id: "c", name: "Carla", points: 20, loanPoints: 15, sportRole: 3 });

  it("ordina sul totale, prestiti compresi", () => {
    expect(sortScorers([a, b, c], "points", "desc").map((r) => r.id)).toEqual(["c", "b", "a"]);
    expect(sortScorers([a, b, c], "points", "asc").map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
  it("non modifica l'array di partenza", () => {
    const input = [a, b, c];
    sortScorers(input, "points", "desc");
    expect(input.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
  it("filtra per ruolo e per nome", () => {
    expect(filterScorers([a, b, c], 3, "").map((r) => r.id)).toEqual(["b", "c"]);
    expect(filterScorers([a, b, c], null, "  CAR ").map((r) => r.id)).toEqual(["c"]);
    expect(filterScorers([a, b, c], 1, "bru")).toEqual([]);
  });
  it("hasAnyLoan guarda le partite in prestito", () => {
    expect(hasAnyLoan([a, b])).toBe(false);
    expect(hasAnyLoan([a, row({ loanMatches: 1 })])).toBe(true);
  });
});
