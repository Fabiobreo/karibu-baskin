import { describe, it, expect } from "vitest";
import { familyTeams, teamKeyOf } from "./trainingTeams";

const teams = {
  teamA: [{ id: "r-luca" }, { id: "x" }],
  teamB: [{ id: "r-me" }],
  teamC: [{ id: "r-anna" }],
};

describe("teamKeyOf", () => {
  it("trova la squadra di un'iscrizione", () => {
    expect(teamKeyOf(teams, "r-me")).toBe("teamB");
    expect(teamKeyOf(teams, "r-anna")).toBe("teamC");
  });

  it("null senza squadre o se l'iscrizione non c'è", () => {
    expect(teamKeyOf(null, "r-me")).toBeNull();
    expect(teamKeyOf(teams, "nessuno")).toBeNull();
  });
});

describe("familyTeams", () => {
  it("mette prima chi guarda, poi i figli", () => {
    const out = familyTeams(
      [
        { id: "r-luca", name: "Luca", self: false },
        { id: "r-me", name: "Paola", self: true },
        { id: "r-anna", name: "Anna", self: false },
      ],
      teams
    );
    expect(out.map((t) => [t.name, t.key])).toEqual([
      ["Paola", "teamB"],
      ["Luca", "teamA"],
      ["Anna", "teamC"],
    ]);
  });

  it("un genitore che non gioca vede la squadra del figlio", () => {
    const out = familyTeams([{ id: "r-luca", name: "Luca", self: false }], teams);
    expect(out).toEqual([{ id: "r-luca", name: "Luca", self: false, key: "teamA" }]);
  });

  it("lascia fuori chi non è in squadra", () => {
    expect(familyTeams([{ id: "coach", name: "Io", self: true }], teams)).toEqual([]);
    expect(familyTeams([{ id: "r-me", name: "Io", self: true }], null)).toEqual([]);
  });
});
