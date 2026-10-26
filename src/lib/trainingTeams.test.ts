import { describe, it, expect } from "vitest";
import {
  assignmentOf,
  familyTeams,
  placeLateAthletes,
  teamChanges,
  teamKeyOf,
} from "./trainingTeams";

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

describe("teamChanges", () => {
  it("prima volta se prima nessuno era in squadra", () => {
    const c = teamChanges({}, { a: "teamA", b: "teamB" });
    expect(c.initial).toBe(true);
    expect(c.added).toHaveLength(2);
  });

  it("distingue chi entra da chi cambia squadra, ignora chi resta e chi esce", () => {
    const c = teamChanges(
      { a: "teamA", b: "teamB", gone: "teamA" },
      { a: "teamA", b: "teamA", nuovo: "teamB" }
    );
    expect(c.initial).toBe(false);
    expect(c.added).toEqual([{ id: "nuovo", key: "teamB" }]);
    expect(c.moved).toEqual([{ id: "b", key: "teamA" }]);
  });

  it("spostato e riportato indietro: nessun cambiamento", () => {
    const before = assignmentOf({ teamA: [{ id: "a" }], teamB: [{ id: "b" }] });
    const c = teamChanges(before, { a: "teamA", b: "teamB" });
    expect(c.added).toEqual([]);
    expect(c.moved).toEqual([]);
  });
});

describe("placeLateAthletes", () => {
  const p = (id: string, role: number) => ({ id, name: id, role });
  const level = (levels: Record<string, number>) => (id: string) => levels[id] ?? 25;

  it("non sposta nessuno e mette il nuovo dove manca il suo ruolo", () => {
    const teams = [
      [p("a3", 3), p("a5", 5)],
      [p("b5", 5), p("b2", 2)],
    ];
    const eligible = [...teams.flat(), p("new3", 3)];
    const out = placeLateAthletes(teams, eligible, level({}));
    expect(out.teams[0].map((a) => a.id)).toEqual(["a3", "a5"]);
    expect(out.teams[1].map((a) => a.id)).toEqual(["b5", "b2", "new3"]);
    expect(out.added).toEqual([{ id: "new3", teamIndex: 1 }]);
  });

  it("a parità di ruolo e numero sceglie la squadra col livello più basso", () => {
    const teams = [[p("a", 3)], [p("b", 3)]];
    const out = placeLateAthletes(teams, [...teams.flat(), p("n", 4)], level({ a: 30, b: 20 }));
    expect(out.added).toEqual([{ id: "n", teamIndex: 1 }]);
  });

  it("toglie chi non è più fra gli iscritti", () => {
    const teams = [[p("a", 3), p("x", 2)], [p("b", 3)]];
    const out = placeLateAthletes(teams, [p("a", 3), p("b", 3)], level({}));
    expect(out.removed).toEqual(["x"]);
    expect(out.teams.flat().map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("due nuovi dello stesso ruolo finiscono in squadre diverse", () => {
    const teams = [[p("a", 1)], [p("b", 1)]];
    const out = placeLateAthletes(teams, [...teams.flat(), p("n1", 4), p("n2", 4)], level({}));
    expect(out.added.map((x) => x.teamIndex).sort()).toEqual([0, 1]);
  });
});
